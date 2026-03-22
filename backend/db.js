const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

function loadEnv() {
  // Prefer backend/.env, but also support a root .env for existing setups.
  const backendEnv = path.join(__dirname, '.env')
  const rootEnv = path.join(__dirname, '..', '.env')

  if (fs.existsSync(backendEnv)) dotenv.config({ path: backendEnv })
  if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv, override: false })
}

function buildPgConfig() {
  const hasConnectionString = Boolean(process.env.DATABASE_URL)
  const hasDiscreteConfig = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)

  if (!hasConnectionString && !hasDiscreteConfig) {
    throw new Error(
      'Database configuration missing. Set DATABASE_URL or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.'
    )
  }

  const sslMode = (process.env.DB_SSL || '').toLowerCase()
  const useSsl = sslMode === 'true' || sslMode === '1' || sslMode === 'require'
  const ssl = useSsl ? { rejectUnauthorized: false } : undefined

  if (hasConnectionString) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl,
    }
  }

  return {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl,
  }
}

function createPool() {
  return new Pool(buildPgConfig())
}

module.exports = {
  loadEnv,
  createPool,
}