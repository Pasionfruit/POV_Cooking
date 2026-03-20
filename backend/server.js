require('dotenv').config()

const express = require('express')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const app = express()
app.use(express.json())
app.use(cors())

// Skip DB connection for local mock/demo mode
const SKIP_DB = process.env.SKIP_DB === 'true' || process.env.SKIP_DB === '1'
const pool = SKIP_DB ? null : new Pool({ connectionString: process.env.DATABASE_URL })

const ADMIN_CODE = process.env.ADMIN_CODE
const JWT_SECRET = process.env.JWT_SECRET || 'secret'

async function initDb() {
  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','user')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      ingredients TEXT[] NOT NULL,
      instructions TEXT NOT NULL,
      time INTEGER,
      duration INTEGER,
      equipment TEXT[],
      user_id INTEGER REFERENCES users(id),
      visibility BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Grains','Vegetables','Fruits','Dairy','Protein','Fats and Oils','Sugars and Sweets')),
      expiration_date DATE,
      quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'pcs',
      unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric','imperial')),
      location TEXT NOT NULL CHECK (location IN ('Fridge','Freezer','Pantry','Misc')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_recipes (
      user_id INTEGER REFERENCES users(id),
      recipe_id INTEGER REFERENCES recipes(id),
      PRIMARY KEY (user_id, recipe_id)
    );
  `)
}

function generateToken(user) {
  const payload = { sub: user.id, role: user.role }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

async function getUserByUsername(username) {
  const res = await pool.query('SELECT * FROM users WHERE username = $1', [username])
  return res.rows[0]
}

async function getUserById(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return res.rows[0]
}

// Auth middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await getUserById(payload.sub)
    if (!user) return res.status(401).json({ error: 'Invalid user' })
    req.user = { id: user.id, username: user.username, role: user.role }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  next()
}

function ownsRecipe(req, recipeOwnerId) {
  return req.user?.id === recipeOwnerId
}

app.post('/auth/register', async (req, res) => {
  const { username, password, adminCode } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' })
  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (existing.rows.length) return res.status(400).json({ error: 'User exists' })

    const hash = await bcrypt.hash(password, 10)
    let role = 'user'
    if (adminCode && adminCode === ADMIN_CODE) role = 'admin'
    const r = await pool.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [username, hash, role])
    res.json({ id: r.rows[0].id, username, role })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' })
  try {
    const user = await getUserByUsername(username)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = generateToken(user)
    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Recipes CRUD
app.get('/recipes', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const r = await pool.query('SELECT * FROM recipes ORDER BY id')
      return res.json(r.rows)
    } else {
      // Explorer: show public recipes and own recipes
      const r = await pool.query('SELECT * FROM recipes WHERE visibility = TRUE OR user_id = $1 ORDER BY id', [req.user.id])
      return res.json(r.rows)
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch recipes' })
  }
})

app.get('/recipes/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const r = await pool.query('SELECT * FROM recipes WHERE id = $1', [id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const recipe = r.rows[0]
    if (req.user.role === 'admin' || recipe.user_id === req.user.id || recipe.visibility === true) {
      return res.json(recipe)
    }
    return res.status(403).json({ error: 'Access denied' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch recipe' })
  }
})

app.post('/recipes', authMiddleware, async (req, res) => {
  const { title, ingredients, instructions, time, duration, equipment, visibility } = req.body
  if (!title || !ingredients || !instructions) return res.status(400).json({ error: 'Missing required fields' })
  try {
    const r = await pool.query(
      `INSERT INTO recipes (title, ingredients, instructions, time, duration, equipment, user_id, visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, 
      [title, ingredients, instructions, time, duration, equipment, req.user.id, visibility ?? false]
    )
    res.json(r.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create recipe' })
  }
})

app.put('/recipes/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { title, ingredients, instructions, time, duration, equipment, visibility } = req.body
  try {
    // fetch to check ownership or admin
    const rr = await pool.query('SELECT * FROM recipes WHERE id = $1', [id])
    if (rr.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const recipe = rr.rows[0]
    if (req.user.role !== 'admin' && recipe.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

    // Build update query dynamically
    const fields = []
    const values = []
    let idx = 1
    if (title !== undefined) { fields.push('title = $' + idx++); values.push(title) }
    if (ingredients !== undefined) { fields.push('ingredients = $' + idx++); values.push(ingredients) }
    if (instructions !== undefined) { fields.push('instructions = $' + idx++); values.push(instructions) }
    if (time !== undefined) { fields.push('time = $' + idx++); values.push(time) }
    if (duration !== undefined) { fields.push('duration = $' + idx++); values.push(duration) }
    if (equipment !== undefined) { fields.push('equipment = $' + idx++); values.push(equipment) }
    if (visibility !== undefined) {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can change visibility' })
      fields.push('visibility = $' + idx++); values.push(visibility)
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    fields.push('updated_at = NOW()')
    const sql = `UPDATE recipes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`
    values.push(id)
    const up = await pool.query(sql, values)
    res.json(up.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update recipe' })
  }
})

app.delete('/recipes/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const rr = await pool.query('SELECT * FROM recipes WHERE id = $1', [id])
    if (rr.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const recipe = rr.rows[0]
    if (req.user.role !== 'admin' && recipe.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    await pool.query('DELETE FROM saved_recipes WHERE recipe_id = $1', [id])
    await pool.query('DELETE FROM recipes WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete recipe' })
  }
})

// Saved recipes (favorites) for current user
app.post('/saved', authMiddleware, async (req, res) => {
  const { recipe_id } = req.body
  if (!recipe_id) return res.status(400).json({ error: 'Missing recipe_id' })
  try {
    // Ensure recipe exists
    const r = await pool.query('SELECT id FROM recipes WHERE id = $1', [recipe_id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' })
    await pool.query('INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, recipe_id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save recipe' })
  }
})

app.get('/saved', authMiddleware, async (req, res) => {
  try {
    const s = await pool.query(
      `SELECT r.* FROM saved_recipes s
       JOIN recipes r ON r.id = s.recipe_id
       WHERE s.user_id = $1`,
      [req.user.id]
    )
    res.json(s.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch saved recipes' })
  }
})

// Pantry endpoints (per-user pantry management)
app.get('/pantry', authMiddleware, async (req, res) => {
  try {
    const q = `SELECT id, user_id, name, category, expiration_date, quantity, unit, unit_system, location, notes, created_at, updated_at,
      (expiration_date IS NOT NULL AND expiration_date <= CURRENT_DATE + INTERVAL '7 days') AS expiring_soon,
      (CASE WHEN expiration_date IS NULL THEN NULL ELSE (expiration_date - CURRENT_DATE) END) AS days_left
      FROM pantry_items WHERE user_id = $1 ORDER BY id`
    const r = await pool.query(q, [req.user.id])
    res.json(r.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch pantry' })
  }
})

app.post('/pantry', authMiddleware, async (req, res) => {
  const { name, category, expiration_date, quantity, unit, unit_system, location, notes } = req.body
  if (!name || !category) return res.status(400).json({ error: 'Missing required fields' })
  try {
    const r = await pool.query(
      `INSERT INTO pantry_items (user_id, name, category, expiration_date, quantity, unit, unit_system, location, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, category, expiration_date || null, quantity ?? 1, unit ?? 'pcs', unit_system ?? 'metric', location, notes]
    )
    res.json(r.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create pantry item' })
  }
})

app.get('/pantry/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const r = await pool.query('SELECT * FROM pantry_items WHERE id = $1', [id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const item = r.rows[0]
    if (item.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    // Attach expiring_soon and days_left like list
    const daysLeft = item.expiration_date ? (item.expiration_date - new Date().setHours(0,0,0,0)) / (1000*60*60*24) : null
    item.expiring_soon = item.expiration_date && item.expiration_date <= new Date().toISOString().slice(0,10) // approximate
    item.days_left = daysLeft
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch pantry item' })
  }
})

app.put('/pantry/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { name, category, expiration_date, quantity, unit, unit_system, location, notes } = req.body
  try {
    const r = await pool.query('SELECT * FROM pantry_items WHERE id = $1', [id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const item = r.rows[0]
    if (item.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const updates = []
    const values = []
    let idx = 1
    if (name !== undefined) { updates.push('name = $' + idx); values.push(name); idx++ }
    if (category !== undefined) { updates.push('category = $' + idx); values.push(category); idx++ }
    if (expiration_date !== undefined) { updates.push('expiration_date = $' + idx); values.push(expiration_date); idx++ }
    if (quantity !== undefined) { updates.push('quantity = $' + idx); values.push(quantity); idx++ }
    if (unit !== undefined) { updates.push('unit = $' + idx); values.push(unit); idx++ }
    if (unit_system !== undefined) { updates.push('unit_system = $' + idx); values.push(unit_system); idx++ }
    if (location !== undefined) { updates.push('location = $' + idx); values.push(location); idx++ }
    if (notes !== undefined) { updates.push('notes = $' + idx); values.push(notes); idx++ }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    updates.push('updated_at = NOW()')
    const sql = `UPDATE pantry_items SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`
    values.push(id)
    const up = await pool.query(sql, values)
    res.json(up.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update pantry item' })
  }
})

app.delete('/pantry/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const r = await pool.query('SELECT * FROM pantry_items WHERE id = $1', [id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const item = r.rows[0]
    if (item.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    await pool.query('DELETE FROM pantry_items WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete pantry item' })
  }
})

if (SKIP_DB) {
  const port = parseInt(process.env.PORT || '5000', 10)
  app.listen(port, () => {
    console.log(`Backend listening on port ${port} (DB skipped)`)
  })
} else {
  initDb().then(() => {
    const port = parseInt(process.env.PORT || '5000', 10)
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`)
    })
  }).catch(err => {
    console.error('Failed to initialize DB', err)
    process.exit(1)
  })
}
