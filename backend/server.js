require('dotenv').config()
const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { recipes, users, saved, tried, pantry, mealplans, settings, suggestions } = require('./store')
const { encryptField, decryptField, blindIndex } = require('./crypto')
const { fetchRecipeFromUrl } = require('./importUrl')

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(cors())

// 5001 because macOS AirPlay occupies port 5000
const PORT = process.env.PORT || 5001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const ADMIN_CODE = process.env.ADMIN_CODE || 'admin-secret'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// ---------------------------------------------------------------- auth helpers

function publicUser(user) {
  return {
    id: user.id,
    email: decryptField(user.email),
    name: user.name ? decryptField(user.name) : null,
    role: user.role,
    provider: user.provider,
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not logged in' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = users.findById(payload.sub)
    if (!user) return res.status(401).json({ error: 'Account no longer exists' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired — log in again' })
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}

function createUser({ email, name, passwordHash, provider, adminCode }) {
  const normalizedEmail = email.trim().toLowerCase()
  const isAdmin = adminCode === ADMIN_CODE || ADMIN_EMAILS.includes(normalizedEmail)
  return users.insert({
    id: crypto.randomUUID(),
    email: encryptField(normalizedEmail),
    emailIndex: blindIndex(normalizedEmail),
    name: name ? encryptField(name.trim()) : null,
    passwordHash: passwordHash || null,
    provider,
    role: isAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  })
}

// ------------------------------------------------------------------ auth routes

app.post('/auth/register', async (req, res) => {
  const { email, password, name, adminCode } = req.body || {}
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Valid email required' })
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (users.find((u) => u.emailIndex === blindIndex(email))) {
    return res.status(409).json({ error: 'An account with that email already exists' })
  }
  const user = createUser({
    email,
    name,
    passwordHash: await bcrypt.hash(password, 10),
    provider: 'email',
    adminCode,
  })
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const user = users.find((u) => u.emailIndex === blindIndex(email))
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  res.json({ token: signToken(user), user: publicUser(user) })
})

// Verifies a Google Identity Services ID token, then creates/finds the account.
app.post('/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google login is not configured on this server' })
  const { credential } = req.body || {}
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' })
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    if (!response.ok) return res.status(401).json({ error: 'Invalid Google token' })
    const info = await response.json()
    if (info.aud !== GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'Google token is for a different app' })
    if (info.email_verified !== 'true' && info.email_verified !== true) {
      return res.status(401).json({ error: 'Google email is not verified' })
    }
    let user = users.find((u) => u.emailIndex === blindIndex(info.email))
    if (!user) {
      user = createUser({ email: info.email, name: info.name, provider: 'google' })
    }
    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (err) {
    console.error('Google auth failed:', err.message)
    res.status(502).json({ error: 'Could not verify Google login' })
  }
})

app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// Deletes the account and everything owned by it. Recipes are shared library
// content, so they stay; only the per-user collections are purged.
app.delete('/auth/me', authMiddleware, (req, res) => {
  const userId = req.user.id
  if (req.user.role === 'admin' && users.filter((u) => u.role === 'admin').length === 1) {
    return res.status(409).json({ error: 'Cannot delete the only admin account' })
  }
  saved.remove((s) => s.userId === userId)
  tried.remove((t) => t.userId === userId)
  pantry.remove((p) => p.userId === userId)
  mealplans.remove((p) => p.userId === userId)
  suggestions.remove((s) => s.userId === userId)
  users.remove((u) => u.id === userId)
  res.json({ ok: true })
})

// ----------------------------------------------------------------- recipe rules

// Input standardization: first word capitalized, quantity words as digits
// ("two cups flour" -> "2 cups flour"). Applied to titles, ingredients, steps,
// descriptions, and notes on every create/update/import.
const NUMBER_WORDS = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7',
  eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', fifteen: '15',
  twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60', hundred: '100',
  half: '1/2', quarter: '1/4',
}
const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`, 'gi')

function standardizeText(value) {
  const text = String(value).trim().replace(NUMBER_WORD_RE, (word) => NUMBER_WORDS[word.toLowerCase()])
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function standardizeIngredient(ing) {
  if (typeof ing === 'string') return standardizeText(ing)
  if (ing && typeof ing === 'object') {
    const out = { ...ing }
    if (typeof out.item === 'string') out.item = out.item.trim().toLowerCase()
    if (typeof out.quantity === 'string') out.quantity = out.quantity.replace(NUMBER_WORD_RE, (w) => NUMBER_WORDS[w.toLowerCase()])
    return out
  }
  return ing
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Alcoholic', 'Snack']

// Meal type is a fixed vocabulary. An explicit value wins; otherwise we try to
// infer one from the tags so imported recipes still get categorized.
function normalizeMealType(value, tags = []) {
  const match = (candidate) => MEAL_TYPES.find((t) => t.toLowerCase() === String(candidate).trim().toLowerCase())
  if (value) return match(value) || null
  for (const tag of tags) {
    const found = match(tag)
    if (found) return found
  }
  return null
}

// Recipes are semi-structured: a few required/normalized fields, everything else
// (nutrition, source, custom fields) passes through untouched.
function normalizeRecipe(input, userId, existing) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Recipe must be a JSON object')
  const title = String(input.title || '').trim()
  if (!title) throw new Error('Recipe needs a title')

  const asStringArray = (value) =>
    Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '' && v != null) : []
  const asNumberOrNull = (value) => {
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const description = String(input.description || '').trim()
  const notes = typeof input.notes === 'string' ? input.notes.trim() : input.notes

  return {
    ...(existing || {}),
    ...input,
    id: existing ? existing.id : crypto.randomUUID(),
    title: standardizeText(title),
    description: description ? standardizeText(description) : '',
    ...(typeof notes === 'string' && notes ? { notes: standardizeText(notes) } : {}),
    image: input.image ? String(input.image) : null,
    servings: asNumberOrNull(input.servings),
    prepTimeMinutes: asNumberOrNull(input.prepTimeMinutes),
    cookTimeMinutes: asNumberOrNull(input.cookTimeMinutes),
    cuisine: input.cuisine ? standardizeText(input.cuisine) : null,
    mealType: normalizeMealType(input.mealType, asStringArray(input.tags).map(String)),
    tags: asStringArray(input.tags).map((t) => String(t).toLowerCase()),
    ingredients: asStringArray(input.ingredients).map(standardizeIngredient),
    steps: asStringArray(input.steps).map(standardizeText),
    createdBy: existing ? existing.createdBy : userId,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------- recipe routes

app.get('/recipes', (req, res) => {
  res.json({ recipes: recipes.all() })
})

app.get('/recipes/:id', (req, res) => {
  const recipe = recipes.findById(req.params.id)
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
  res.json({ recipe })
})

app.post('/recipes', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const recipe = recipes.insert(normalizeRecipe(req.body, req.user.id))
    res.status(201).json({ recipe })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/recipes/:id', authMiddleware, adminMiddleware, (req, res) => {
  const existing = recipes.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Recipe not found' })
  try {
    const updated = recipes.update(existing.id, normalizeRecipe(req.body, req.user.id, existing))
    res.json({ recipe: updated })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/recipes/:id', authMiddleware, adminMiddleware, (req, res) => {
  const removed = recipes.remove((r) => r.id === req.params.id)
  if (!removed) return res.status(404).json({ error: 'Recipe not found' })
  saved.remove((s) => s.recipeId === req.params.id)
  tried.remove((t) => t.recipeId === req.params.id)
  // scrub the recipe from every meal plan
  mealplans.all().forEach((plan) => {
    const days = {}
    let changed = false
    for (const [day, value] of Object.entries(plan.days || {})) {
      const list = Array.isArray(value) ? value : Object.values(value || {}).flat()
      const kept = list.filter((id) => id !== req.params.id)
      if (kept.length !== list.length) changed = true
      if (kept.length) days[day] = kept
    }
    if (changed) mealplans.update(plan.id, { days })
  })
  const featured = settings.findById('featured')
  if (featured?.recipeId === req.params.id) settings.update('featured', { recipeId: null })
  res.json({ ok: true })
})

// Bulk import: accepts a raw array, { recipes: [...] }, or a single recipe object.
app.post('/recipes/import', authMiddleware, adminMiddleware, (req, res) => {
  const body = req.body
  const list = Array.isArray(body) ? body : Array.isArray(body?.recipes) ? body.recipes : [body]
  const imported = []
  const skipped = []
  list.forEach((item, index) => {
    try {
      imported.push(recipes.insert(normalizeRecipe(item, req.user.id)))
    } catch (err) {
      skipped.push({ index, title: item?.title || null, reason: err.message })
    }
  })
  res.status(imported.length ? 201 : 400).json({ importedCount: imported.length, imported, skipped })
})

// ------------------------------------------------------------ suggestion routes

// Any logged-in user can suggest a recipe; admins review and approve.
function publicSuggestion(suggestion) {
  const author = users.findById(suggestion.userId)
  return {
    ...suggestion,
    submittedBy: author ? publicUser(author).name || publicUser(author).email : 'Deleted account',
  }
}

app.post('/suggestions', authMiddleware, (req, res) => {
  const { note, ...rest } = req.body || {}
  const payload = rest.recipe || rest
  try {
    const recipe = normalizeRecipe(payload, req.user.id)
    const suggestion = suggestions.insert({
      id: crypto.randomUUID(),
      userId: req.user.id,
      recipe,
      note: note ? String(note).trim() : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      recipeId: null,
    })
    res.status(201).json({ suggestion })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get('/suggestions/mine', authMiddleware, (req, res) => {
  res.json({ suggestions: suggestions.filter((s) => s.userId === req.user.id) })
})

app.get('/suggestions', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.query
  const list = suggestions.filter((s) => (status ? s.status === status : true)).map(publicSuggestion)
  res.json({ suggestions: list })
})

app.put('/suggestions/:id', authMiddleware, adminMiddleware, (req, res) => {
  const existing = suggestions.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Suggestion not found' })
  try {
    const recipe = normalizeRecipe(req.body.recipe || req.body, existing.userId, existing.recipe)
    res.json({ suggestion: publicSuggestion(suggestions.update(existing.id, { recipe })) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Approve: copy the suggestion (with any admin edits) into the cookbook.
app.post('/suggestions/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
  const existing = suggestions.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Suggestion not found' })
  if (existing.status === 'approved') return res.status(409).json({ error: 'That suggestion is already published' })
  try {
    // The admin may have edited the suggestion in the review form; prefer that.
    const edited = req.body?.recipe || (req.body?.title ? req.body : null)
    const recipe = recipes.insert(normalizeRecipe(edited || existing.recipe, req.user.id))
    suggestions.update(existing.id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      recipeId: recipe.id,
      recipe: { ...existing.recipe, ...recipe },
    })
    res.status(201).json({ recipe })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/suggestions/:id/reject', authMiddleware, adminMiddleware, (req, res) => {
  const existing = suggestions.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Suggestion not found' })
  const updated = suggestions.update(existing.id, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewNote: req.body?.note ? String(req.body.note).trim() : null,
  })
  res.json({ suggestion: publicSuggestion(updated) })
})

app.delete('/suggestions/:id', authMiddleware, adminMiddleware, (req, res) => {
  const removed = suggestions.remove((s) => s.id === req.params.id)
  if (!removed) return res.status(404).json({ error: 'Suggestion not found' })
  res.json({ ok: true })
})

// Fetch and parse a recipe from a link. This only returns a preview — the admin
// reviews it and posts to /recipes to actually save it.
app.post('/recipes/import-url', authMiddleware, adminMiddleware, async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Paste a link to import' })
  try {
    const result = await fetchRecipeFromUrl(url)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ----------------------------------------------------------------- saved routes

app.get('/saved', authMiddleware, (req, res) => {
  const entries = saved.filter((s) => s.userId === req.user.id)
  const items = entries.map((s) => recipes.findById(s.recipeId)).filter(Boolean)
  res.json({ recipes: items })
})

app.post('/saved/:recipeId', authMiddleware, (req, res) => {
  const recipe = recipes.findById(req.params.recipeId)
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
  const exists = saved.find((s) => s.userId === req.user.id && s.recipeId === recipe.id)
  if (!exists) {
    saved.insert({ id: crypto.randomUUID(), userId: req.user.id, recipeId: recipe.id, savedAt: new Date().toISOString() })
  }
  res.status(201).json({ ok: true })
})

app.delete('/saved/:recipeId', authMiddleware, (req, res) => {
  saved.remove((s) => s.userId === req.user.id && s.recipeId === req.params.recipeId)
  res.json({ ok: true })
})

// ----------------------------------------------------------------- tried routes

// Recipes the user has actually cooked. Powers the "never cooked" filter.
app.get('/tried', authMiddleware, (req, res) => {
  res.json({ recipeIds: tried.filter((t) => t.userId === req.user.id).map((t) => t.recipeId) })
})

app.post('/tried/:recipeId', authMiddleware, (req, res) => {
  const recipe = recipes.findById(req.params.recipeId)
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
  const exists = tried.find((t) => t.userId === req.user.id && t.recipeId === recipe.id)
  if (!exists) {
    tried.insert({ id: crypto.randomUUID(), userId: req.user.id, recipeId: recipe.id, triedAt: new Date().toISOString() })
  }
  res.status(201).json({ ok: true })
})

app.delete('/tried/:recipeId', authMiddleware, (req, res) => {
  tried.remove((t) => t.userId === req.user.id && t.recipeId === req.params.recipeId)
  res.json({ ok: true })
})

// --------------------------------------------------------------- pantry routes

// What the user has on hand. `purchasedAt` is when it was bought or the meal was
// made; `shelfLifeDays` drives the countdown the UI shows.
const PANTRY_LOCATIONS = ['Fridge', 'Freezer', 'Pantry']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normalizePantryItem(input, userId, existing) {
  const name = String(input?.name || '').trim()
  if (!name) throw new Error('Item needs a name')
  const location =
    PANTRY_LOCATIONS.find((l) => l.toLowerCase() === String(input.location || '').trim().toLowerCase()) || 'Pantry'
  const shelfLife = Number(input.shelfLifeDays)
  return {
    ...(existing || {}),
    id: existing ? existing.id : crypto.randomUUID(),
    userId: existing ? existing.userId : userId,
    name: standardizeText(name),
    location,
    quantity: input.quantity ? standardizeText(String(input.quantity)) : null,
    purchasedAt: DATE_RE.test(input.purchasedAt || '') ? input.purchasedAt : new Date().toISOString().slice(0, 10),
    shelfLifeDays: Number.isFinite(shelfLife) && shelfLife > 0 ? Math.min(Math.round(shelfLife), 3650) : 7,
    notes: input.notes ? standardizeText(String(input.notes)) : null,
    updatedAt: new Date().toISOString(),
  }
}

app.get('/pantry', authMiddleware, (req, res) => {
  res.json({ items: pantry.filter((item) => item.userId === req.user.id) })
})

app.post('/pantry', authMiddleware, (req, res) => {
  try {
    res.status(201).json({ item: pantry.insert(normalizePantryItem(req.body, req.user.id)) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/pantry/:id', authMiddleware, (req, res) => {
  const existing = pantry.findById(req.params.id)
  if (!existing || existing.userId !== req.user.id) return res.status(404).json({ error: 'Item not found' })
  try {
    res.json({ item: pantry.update(existing.id, normalizePantryItem(req.body, req.user.id, existing)) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/pantry/:id', authMiddleware, (req, res) => {
  const removed = pantry.remove((item) => item.id === req.params.id && item.userId === req.user.id)
  if (!removed) return res.status(404).json({ error: 'Item not found' })
  res.json({ ok: true })
})

// -------------------------------------------------------------- featured recipe

// The admin can pin one recipe ("latest attempt") to the top of the home page.
app.get('/featured', (req, res) => {
  const setting = settings.findById('featured')
  const recipe = setting?.recipeId ? recipes.findById(setting.recipeId) : null
  res.json({ recipe })
})

app.put('/featured', authMiddleware, adminMiddleware, (req, res) => {
  const { recipeId } = req.body || {}
  if (recipeId != null && !recipes.findById(recipeId)) return res.status(404).json({ error: 'Recipe not found' })
  const existing = settings.findById('featured')
  const doc = { id: 'featured', recipeId: recipeId || null, updatedAt: new Date().toISOString() }
  const stored = existing ? settings.update('featured', doc) : settings.insert(doc)
  res.json({ recipe: stored.recipeId ? recipes.findById(stored.recipeId) : null })
})

// ------------------------------------------------------------- meal plan routes

// One plan per user per week. `weekStart` is the Monday as YYYY-MM-DD;
// `days` maps day index 0-6 (Mon-Sun) to a list of entries. An entry is either
// a recipe id (string) or a free-text plan the user typed: { text: "Leftovers" }.
const WEEK_START_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ENTRY_TEXT = 120

function sanitizeEntry(entry) {
  if (typeof entry === 'string') return recipes.findById(entry) ? entry : null
  if (entry && typeof entry === 'object' && typeof entry.text === 'string') {
    const text = entry.text.trim().slice(0, MAX_ENTRY_TEXT)
    return text ? { text } : null
  }
  return null
}

function sanitizeDays(days) {
  const clean = {}
  for (const [key, value] of Object.entries(days || {})) {
    if (!/^[0-6]$/.test(key)) continue
    // Plans saved while meal slots existed stored { breakfast: [...] } — flatten those.
    const list = Array.isArray(value) ? value : Object.values(value || {}).flat()
    const seen = new Set()
    const entries = []
    for (const raw of list) {
      const entry = sanitizeEntry(raw)
      if (!entry) continue
      const dedupeKey = typeof entry === 'string' ? `id:${entry}` : `text:${entry.text.toLowerCase()}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      entries.push(entry)
      if (entries.length === 20) break
    }
    if (entries.length) clean[key] = entries
  }
  return clean
}

app.get('/meal-plan', authMiddleware, (req, res) => {
  const { weekStart } = req.query
  if (!WEEK_START_RE.test(weekStart || '')) return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) required' })
  const plan = mealplans.find((p) => p.userId === req.user.id && p.weekStart === weekStart)
  // Run stored days through the sanitizer so older shapes and deleted recipes
  // never reach the client.
  res.json({ plan: plan ? { ...plan, days: sanitizeDays(plan.days) } : null })
})

app.put('/meal-plan', authMiddleware, (req, res) => {
  const { weekStart, days } = req.body || {}
  if (!WEEK_START_RE.test(weekStart || '')) return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) required' })
  const clean = sanitizeDays(days)
  const existing = mealplans.find((p) => p.userId === req.user.id && p.weekStart === weekStart)
  const plan = existing
    ? mealplans.update(existing.id, { days: clean, updatedAt: new Date().toISOString() })
    : mealplans.insert({
        id: crypto.randomUUID(),
        userId: req.user.id,
        weekStart,
        days: clean,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
  res.json({ plan })
})

// ----------------------------------------------------------------------- misc

app.get('/health', (req, res) => res.json({ ok: true }))

app.use((req, res) => res.status(404).json({ error: 'Not found' }))

// Demo accounts so the app is usable straight after cloning.
const DEMO_ACCOUNTS = [
  { email: 'demo@povcooking.com', password: 'demo1234', name: 'Demo', adminCode: null },
  { email: 'admin@povcooking.com', password: 'admin1234', name: 'Demo Admin', adminCode: ADMIN_CODE },
]

async function ensureDemoUsers() {
  for (const account of DEMO_ACCOUNTS) {
    if (users.find((u) => u.emailIndex === blindIndex(account.email))) continue
    createUser({
      email: account.email,
      name: account.name,
      passwordHash: await bcrypt.hash(account.password, 10),
      provider: 'email',
      adminCode: account.adminCode,
    })
    console.log(`Seeded demo account: ${account.email} / ${account.password}`)
  }
}

ensureDemoUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`POV Cooking API running on http://localhost:${PORT}`)
    if (!GOOGLE_CLIENT_ID) console.log('Google login disabled (set GOOGLE_CLIENT_ID to enable)')
  })
})
