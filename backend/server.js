require('dotenv').config()
const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const store = require('./store')
const { recipes, users, saved, tried, pantry, mealplans, settings, suggestions, groceryCatalog, grocery } = store
const { encryptField, decryptField, blindIndex } = require('./crypto')
const { fetchRecipeFromUrl } = require('./importUrl')

const app = express()
app.use(express.json({ limit: '2mb' }))

// 5001 because macOS AirPlay occupies port 5000
const PORT = process.env.PORT || 5001
const IS_PROD = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const ADMIN_CODE = process.env.ADMIN_CODE || 'admin-secret'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Refuse to run in production on the built-in development secrets: the fallback
// JWT secret would let anyone mint a valid session, and the fallback encryption
// key would make every stored email decryptable by anyone with the source.
if (IS_PROD) {
  const missing = ['JWT_SECRET', 'ENCRYPTION_KEY'].filter((name) => !process.env[name])
  if (missing.length) {
    console.error(`Refusing to start: ${missing.join(' and ')} must be set when NODE_ENV=production.`)
    process.exit(1)
  }
}

// In production only the deployed frontend may call the API. Left unset (local
// development) any origin is allowed, which is how it behaved before.
const CORS_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

// Turn a disallowed origin away with a clear 403 (including its preflight)
// rather than letting the cors package throw its way to a 500.
app.use((req, res, next) => {
  const origin = req.headers.origin
  // No Origin header at all: curl, health checks, server-to-server.
  if (!CORS_ORIGINS.length || !origin || CORS_ORIGINS.includes(origin.replace(/\/$/, ''))) return next()
  res.status(403).json({ error: 'Origin not allowed' })
})

app.use(cors(CORS_ORIGINS.length ? { origin: CORS_ORIGINS } : {}))

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

// ADMIN_EMAILS is re-checked on every sign-in, not just at registration.
// Otherwise adding yourself to the list after you had already signed in would
// leave you a plain user with no way to promote yourself on a deployed server.
function syncAdminRole(user) {
  if (!ADMIN_EMAILS.length || user.role === 'admin') return user
  let email
  try {
    email = decryptField(user.email)
  } catch {
    return user
  }
  if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) return user
  console.log(`Promoting ${email} to admin (listed in ADMIN_EMAILS)`)
  return users.update(user.id, { role: 'admin' }) || user
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
  const found = users.find((u) => u.emailIndex === blindIndex(email))
  if (!found || !found.passwordHash || !(await bcrypt.compare(password, found.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const user = syncAdminRole(found)
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
    } else {
      user = syncAdminRole(user)
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
  grocery.remove((g) => g.userId === userId)
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
const PANTRY_TYPES = [
  'Produce',
  'Dairy',
  'Meat',
  'Seafood',
  'Grains',
  'Bakery',
  'Canned',
  'Condiment',
  'Spice',
  'Snack',
  'Beverage',
  'Other',
]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normalizePantryItem(input, userId, existing) {
  const name = String(input?.name || '').trim()
  if (!name) throw new Error('Item needs a name')
  const location =
    PANTRY_LOCATIONS.find((l) => l.toLowerCase() === String(input.location || '').trim().toLowerCase()) || 'Pantry'
  const type = PANTRY_TYPES.find((t) => t.toLowerCase() === String(input.type || '').trim().toLowerCase()) || 'Other'
  const shelfLife = Number(input.shelfLifeDays)
  const barcode = String(input.barcode || '').replace(/\D/g, '')
  return {
    ...(existing || {}),
    id: existing ? existing.id : crypto.randomUUID(),
    userId: existing ? existing.userId : userId,
    name: standardizeText(name),
    location,
    type,
    quantity: input.quantity ? standardizeText(String(input.quantity)) : null,
    purchasedAt: DATE_RE.test(input.purchasedAt || '') ? input.purchasedAt : new Date().toISOString().slice(0, 10),
    shelfLifeDays: Number.isFinite(shelfLife) && shelfLife > 0 ? Math.min(Math.round(shelfLife), 3650) : 7,
    notes: input.notes ? standardizeText(String(input.notes)) : null,
    barcode: barcode || null,
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

// A starter kitchen so the filters and recipe matching have something to chew
// on. `ago` is days before today, so the sample always has a realistic spread
// of fresh, use-soon, and already-expired items.
const SAMPLE_PANTRY = [
  { name: 'Chicken thighs', location: 'Fridge', type: 'Meat', quantity: '600 g', ago: 1, shelfLifeDays: 4 },
  { name: 'Whole milk', location: 'Fridge', type: 'Dairy', quantity: '1 L', ago: 4, shelfLifeDays: 10 },
  { name: 'Greek yogurt', location: 'Fridge', type: 'Dairy', quantity: '500 g', ago: 9, shelfLifeDays: 10 },
  { name: 'Baby spinach', location: 'Fridge', type: 'Produce', quantity: '150 g', ago: 5, shelfLifeDays: 6 },
  { name: 'Bell peppers', location: 'Fridge', type: 'Produce', quantity: '3', ago: 2, shelfLifeDays: 9 },
  { name: 'Fresh mozzarella', location: 'Fridge', type: 'Dairy', quantity: '125 g', ago: 8, shelfLifeDays: 7 },
  { name: 'Eggs', location: 'Fridge', type: 'Dairy', quantity: '12', ago: 6, shelfLifeDays: 28 },
  { name: 'Ground beef', location: 'Freezer', type: 'Meat', quantity: '500 g', ago: 20, shelfLifeDays: 120 },
  { name: 'Shrimp', location: 'Freezer', type: 'Seafood', quantity: '400 g', ago: 45, shelfLifeDays: 180 },
  { name: 'Peas', location: 'Freezer', type: 'Produce', quantity: '750 g', ago: 30, shelfLifeDays: 270 },
  { name: 'Pizza dough', location: 'Freezer', type: 'Bakery', quantity: '2 balls', ago: 14, shelfLifeDays: 90 },
  { name: 'Spaghetti', location: 'Pantry', type: 'Grains', quantity: '500 g', ago: 40, shelfLifeDays: 540 },
  { name: 'Jasmine rice', location: 'Pantry', type: 'Grains', quantity: '2 kg', ago: 70, shelfLifeDays: 720 },
  { name: 'Tomato passata', location: 'Pantry', type: 'Canned', quantity: '700 ml', ago: 25, shelfLifeDays: 400 },
  { name: 'Chickpeas', location: 'Pantry', type: 'Canned', quantity: '2 tins', ago: 60, shelfLifeDays: 730 },
  { name: 'Olive oil', location: 'Pantry', type: 'Condiment', quantity: '750 ml', ago: 90, shelfLifeDays: 540 },
  { name: 'Soy sauce', location: 'Pantry', type: 'Condiment', quantity: '250 ml', ago: 120, shelfLifeDays: 730 },
  { name: 'Smoked paprika', location: 'Pantry', type: 'Spice', quantity: '50 g', ago: 200, shelfLifeDays: 730 },
  { name: 'Sourdough loaf', location: 'Pantry', type: 'Bakery', quantity: '1', ago: 4, shelfLifeDays: 3 },
]

app.post('/pantry/sample', authMiddleware, (req, res) => {
  const existing = pantry.filter((item) => item.userId === req.user.id)
  const taken = new Set(existing.map((item) => `${item.name.toLowerCase()}|${item.location}`))
  const added = []
  for (const sample of SAMPLE_PANTRY) {
    if (taken.has(`${sample.name.toLowerCase()}|${sample.location}`)) continue
    const purchased = new Date()
    purchased.setDate(purchased.getDate() - sample.ago)
    added.push(
      pantry.insert(
        normalizePantryItem({ ...sample, purchasedAt: purchased.toISOString().slice(0, 10) }, req.user.id)
      )
    )
  }
  res.status(201).json({ items: added, skipped: SAMPLE_PANTRY.length - added.length })
})

// Barcode -> product, via Open Food Facts. Proxied through the server so the
// browser never has to deal with the third party directly.
const OFF_TYPE_HINTS = [
  [/dairy|milk|cheese|yogurt|yoghurt|butter|cream/, 'Dairy'],
  [/seafood|fish|shrimp|prawn|salmon|tuna/, 'Seafood'],
  [/meat|poultry|chicken|beef|pork|sausage|bacon/, 'Meat'],
  [/pasta|noodle|rice|cereal|grain|flour|oat|bulgur|couscous/, 'Grains'],
  [/bread|bakery|pastr|cake|tortilla|baguette/, 'Bakery'],
  [/spice|herb|seasoning/, 'Spice'],
  [/sauce|condiment|oil|vinegar|dressing|syrup|mustard|ketchup/, 'Condiment'],
  [/canned|tinned|conserve/, 'Canned'],
  [/snack|biscuit|chip|crisp|candy|chocolate|confection/, 'Snack'],
  [/beverage|drink|water|juice|soda|coffee|tea/, 'Beverage'],
  [/frozen/, 'Frozen'],
  [/fruit|vegetable|produce|salad|fresh/, 'Produce'],
]

// Open Food Facts orders categories_tags general -> specific, and its broadest
// umbrella tags ("plant-based-foods-and-beverages") contain words that would
// mislead a naive substring match. So walk the tags most-specific first and
// take the first one that maps to a type we track.
const OFF_UMBRELLA_TAGS = /plant-based-foods-and-beverages|^en:groceries$|^en:foods?$/

function guessType(categoryTags) {
  const tags = (Array.isArray(categoryTags) ? categoryTags : [])
    .map((t) => String(t).toLowerCase())
    .filter((t) => !OFF_UMBRELLA_TAGS.test(t))
  for (let i = tags.length - 1; i >= 0; i--) {
    const hit = OFF_TYPE_HINTS.find(([re]) => re.test(tags[i]))
    // "Frozen" is a location in this app, not a type — keep looking.
    if (hit && hit[1] !== 'Frozen') return hit[1]
  }
  return 'Other'
}

app.get('/pantry/barcode/:code', authMiddleware, async (req, res) => {
  const code = String(req.params.code || '').replace(/\D/g, '')
  if (code.length < 6 || code.length > 14) return res.status(400).json({ error: 'That does not look like a barcode' })
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
    '?fields=product_name,generic_name,brands,quantity,categories_tags'
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'POV-Cooking/1.0 (pantry barcode lookup)' },
    }).finally(() => clearTimeout(timeout))
    if (!response.ok) return res.status(502).json({ error: 'Product lookup failed' })
    const data = await response.json()
    const product = data.status === 1 ? data.product : null
    if (!product) return res.status(404).json({ error: 'No product found for that barcode', code })
    const name = String(product.product_name || product.generic_name || '').trim()
    if (!name) return res.status(404).json({ error: 'No product found for that barcode', code })
    res.json({
      code,
      name,
      brand: String(product.brands || '').split(',')[0].trim() || null,
      quantity: product.quantity || null,
      type: guessType(product.categories_tags),
    })
  } catch (err) {
    console.error('Barcode lookup failed:', err.message)
    res.status(502).json({ error: 'Could not reach the product database' })
  }
})

// Typical fridge/pantry life by category, used to pre-fill a guess the user
// can still override — same spirit as the barcode lookup's category guess.
const SHELF_LIFE_BY_TYPE = {
  Produce: 7,
  Dairy: 10,
  Meat: 4,
  Seafood: 3,
  Grains: 365,
  Bakery: 5,
  Canned: 545,
  Condiment: 270,
  Spice: 730,
  Snack: 120,
  Beverage: 180,
  Other: 14,
}

// Best-effort category guess from a receipt line's item name — same idea as
// guessType() above, but matched against free text rather than Open Food
// Facts category tags, since a receipt only ever gives us a name to go on.
const NAME_TYPE_HINTS = [
  [/\b(milk|cheese|yogurt|yoghurt|butter|cream|egg)/i, 'Dairy'],
  [/\b(chicken|beef|pork|turkey|sausage|bacon|steak)\b/i, 'Meat'],
  [/\bground (beef|turkey|pork|lamb|chicken)\b/i, 'Meat'],
  [/\b(shrimp|salmon|tuna|fish|crab|tilapia)/i, 'Seafood'],
  [/\b(bread|bagel|muffin|croissant|tortilla|bun|roll)/i, 'Bakery'],
  [/\b(rice|pasta|noodle|cereal|oat|flour|quinoa)/i, 'Grains'],
  [/\b(can|canned|soup|beans?)\b/i, 'Canned'],
  [/\b(sauce|ketchup|mustard|mayo|dressing|oil|vinegar|syrup)/i, 'Condiment'],
  [/\b(spice|pepper|salt|season|cinnamon|paprika)/i, 'Spice'],
  [/\b(chip|cookie|cracker|candy|chocolate|snack)/i, 'Snack'],
  [/\b(soda|juice|water|coffee|tea|drink)/i, 'Beverage'],
  [/\b(apple|banana|lettuce|tomato|onion|potato|carrot|spinach|berry|fruit|veg)/i, 'Produce'],
]

function guessTypeFromName(name) {
  const hit = NAME_TYPE_HINTS.find(([re]) => re.test(name))
  return hit ? hit[1] : 'Other'
}

// Receipts OCR into noisy text: store header/footer, prices, barcodes,
// totals. This keeps only plausible item lines and guesses a quantity +
// category for each — deliberately rough, since the confirmation popup on
// the frontend is where the user actually corrects it before anything saves.
const RECEIPT_NOISE_RE =
  /^(subtotal|total|tax|change|cash|credit|debit|card|balance|tender|visa|mastercard|amex|discover|approved|auth|ref|thank you|store|receipt|cashier|register|member|savings|order|transaction|www\.|http)/i
// A bare trailing price ("...  1.29" or "...  @ 9.99"), with no quantity digit
// to say how many — just a leftover unit-price marker to strip alongside it.
const RECEIPT_PRICE_RE = /\s*[@x×]?\s*\$?\d+\.\d{2}\s*$/i
// A leading "2 x " quantity, occasionally seen before the item name.
const RECEIPT_QTY_PREFIX_RE = /^(\d+)\s*[x×]\s*/i
// The far more common shape: a trailing "2 x 1.29" or "2 @ 1.29" (quantity,
// separator, unit price) — must be checked before the bare-price stripper,
// or the "2 x" is left dangling on the name.
const RECEIPT_QTY_PRICE_SUFFIX_RE = /\s*(\d+)\s*[x×@]\s*\$?\d+\.\d{2}\s*$/i

function parseReceiptText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const items = []
  for (const rawLine of lines) {
    if (RECEIPT_NOISE_RE.test(rawLine)) continue
    if (/^\d+$/.test(rawLine)) continue // a bare barcode/SKU line
    if (/^[\d\s\-.:/]+$/.test(rawLine)) continue // dates, phone numbers, totals-only lines

    let line = rawLine
    let quantity = null

    const leadingQty = line.match(RECEIPT_QTY_PREFIX_RE)
    if (leadingQty) {
      quantity = leadingQty[1]
      line = line.slice(leadingQty[0].length)
    }

    const trailingQtyPrice = line.match(RECEIPT_QTY_PRICE_SUFFIX_RE)
    if (trailingQtyPrice) {
      quantity = quantity || trailingQtyPrice[1]
      line = line.slice(0, line.length - trailingQtyPrice[0].length)
    } else {
      line = line.replace(RECEIPT_PRICE_RE, '')
    }

    const name = standardizeText(line.replace(/\s+/g, ' ').trim())
    if (name.length < 2) continue

    const type = guessTypeFromName(name)
    items.push({ name, quantity, type, shelfLifeDays: SHELF_LIFE_BY_TYPE[type] })
  }
  // A single receipt rarely has more than ~40 line items; cap generously to
  // keep the confirmation popup manageable and guard against garbage OCR text.
  return items.slice(0, 60)
}

app.post('/pantry/receipt/parse', authMiddleware, (req, res) => {
  const text = String(req.body?.text || '')
  if (!text.trim()) return res.status(400).json({ error: 'No text to parse' })
  res.json({ items: parseReceiptText(text) })
})

// Confirmed receipt items land here in one request rather than one POST
// /pantry per row.
app.post('/pantry/bulk', authMiddleware, (req, res) => {
  const list = Array.isArray(req.body?.items) ? req.body.items : []
  const inserted = []
  const skipped = []
  list.forEach((raw, index) => {
    try {
      inserted.push(pantry.insert(normalizePantryItem(raw, req.user.id)))
    } catch (err) {
      skipped.push({ index, reason: err.message })
    }
  })
  res.status(inserted.length ? 201 : 400).json({ items: inserted, skipped })
})

// ------------------------------------------------------------- grocery routes

// The catalog is the admin-curated picklist that powers the grocery list's
// add-item dropdown (frontend/src/components/ItemCombobox.jsx). Shared across
// all users, same relationship as recipes are to meal plans.
function normalizeGroceryCatalogItem(input, existing) {
  const name = String(input?.name || '').trim()
  if (!name) throw new Error('Item needs a name')
  const category = PANTRY_TYPES.find((t) => t.toLowerCase() === String(input.category || '').trim().toLowerCase()) || 'Other'
  return {
    ...(existing || {}),
    id: existing ? existing.id : crypto.randomUUID(),
    name: standardizeText(name),
    category,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

app.get('/grocery-catalog', authMiddleware, (req, res) => {
  res.json({ items: groceryCatalog.all() })
})

app.post('/grocery-catalog', authMiddleware, adminMiddleware, (req, res) => {
  try {
    res.status(201).json({ item: groceryCatalog.insert(normalizeGroceryCatalogItem(req.body)) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/grocery-catalog/:id', authMiddleware, adminMiddleware, (req, res) => {
  const existing = groceryCatalog.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Item not found' })
  try {
    res.json({ item: groceryCatalog.update(existing.id, normalizeGroceryCatalogItem(req.body, existing)) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/grocery-catalog/:id', authMiddleware, adminMiddleware, (req, res) => {
  const removed = groceryCatalog.remove((item) => item.id === req.params.id)
  if (!removed) return res.status(404).json({ error: 'Item not found' })
  res.json({ ok: true })
})

// A user's personal shopping list. `name` and `category` are denormalized from
// the catalog entry at add/edit time (same reasoning as meal-plan entries
// keeping a recipe's title) so the list still reads fine if the catalog entry
// is later edited or removed.
function normalizeGroceryItem(input, userId, existing) {
  const name = String(input?.name || '').trim()
  if (!name) throw new Error('Item needs a name')
  const catalogEntry = input.catalogItemId ? groceryCatalog.findById(input.catalogItemId) : null
  return {
    ...(existing || {}),
    id: existing ? existing.id : crypto.randomUUID(),
    userId: existing ? existing.userId : userId,
    name: standardizeText(name),
    catalogItemId: catalogEntry ? catalogEntry.id : null,
    category: catalogEntry ? catalogEntry.category : null,
    quantity: input.quantity ? standardizeText(String(input.quantity)) : null,
    checked: Boolean(input.checked),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

app.get('/grocery-list', authMiddleware, (req, res) => {
  res.json({ items: grocery.filter((item) => item.userId === req.user.id) })
})

app.post('/grocery-list', authMiddleware, (req, res) => {
  try {
    res.status(201).json({ item: grocery.insert(normalizeGroceryItem(req.body, req.user.id)) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/grocery-list/:id', authMiddleware, (req, res) => {
  const existing = grocery.findById(req.params.id)
  if (!existing || existing.userId !== req.user.id) return res.status(404).json({ error: 'Item not found' })
  try {
    res.json({ item: grocery.update(existing.id, normalizeGroceryItem(req.body, req.user.id, existing)) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/grocery-list/:id', authMiddleware, (req, res) => {
  const removed = grocery.remove((item) => item.id === req.params.id && item.userId === req.user.id)
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

// Demo accounts so the app is usable straight after cloning. Off in production
// by default — published credentials would be an open door. Set SEED_DEMO=true
// to opt back in.
const SEED_DEMO = process.env.SEED_DEMO ? process.env.SEED_DEMO === 'true' : !IS_PROD
const DEMO_ACCOUNTS = [
  { email: 'demo@povcooking.com', password: 'demo1234', name: 'Demo', adminCode: null },
  { email: 'admin@povcooking.com', password: 'admin1234', name: 'Demo Admin', adminCode: ADMIN_CODE },
]

async function ensureDemoUsers() {
  if (!SEED_DEMO) return
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

async function start() {
  // Load the data layer before serving, so no request can hit an empty cache.
  const { driver, location, seeded } = await store.connect()
  console.log(`Store: ${driver} (${location})`)
  if (seeded?.length) console.log(`Seeded fresh database from repo data: ${seeded.join(', ')}`)

  await ensureDemoUsers()

  const server = app.listen(PORT, () => {
    console.log(`POV Cooking API running on port ${PORT}`)
    if (!GOOGLE_CLIENT_ID) console.log('Google login disabled (set GOOGLE_CLIENT_ID to enable)')
    if (IS_PROD && !CORS_ORIGINS.length) console.log('WARNING: CORS_ORIGIN is unset — the API accepts any origin')
  })

  // Hosts restart containers with SIGTERM; let queued writes land first.
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      console.log(`${signal} received, shutting down…`)
      server.close(() => store.close().then(() => process.exit(0)))
      setTimeout(() => process.exit(0), 10000).unref()
    })
  }
}

start().catch((err) => {
  console.error('Failed to start:', err.message)
  process.exit(1)
})
