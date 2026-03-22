// Lightweight script to create test users (tester and tester-admin) with bcrypt-hashed passwords.
// Usage: node backend/scripts/seed_test_users.js
const bcrypt = require('bcryptjs')
const { loadEnv, createPool } = require('../db')

loadEnv()
const pool = createPool()

async function seed() {
  const tester = 'tester'
  const testerPass = 'testpass'
  const testerHash = await bcrypt.hash(testerPass, 10)
  const testerAdmin = 'tester_admin'
  const testerAdminPass = 'adminpass'
  const testerAdminHash = await bcrypt.hash(testerAdminPass, 10)

  try {
    // Create tester (non-admin) if not exists
    await pool.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'user') ON CONFLICT (username) DO NOTHING`,
      [tester, testerHash]
    )
    // Create tester-admin if not exists
    await pool.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (username) DO NOTHING`,
      [testerAdmin, testerAdminHash]
    )
    // Fetch IDs
    const t = (await pool.query('SELECT id, username FROM users WHERE username IN ($1, $2)', [tester, testerAdmin])).rows
    console.log('Seeded test users:')
    t.forEach(u => console.log(`- ${u.username} (id: ${u.id})`))
  } catch (e) {
    console.error('Failed to seed test users:', e.message)
  } finally {
    await pool.end()
  }
}

seed()
