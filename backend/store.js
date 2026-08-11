// Data layer. Two backends sit behind one synchronous interface:
//
//   - JSON files on disk  — the default. Zero setup, used for local development.
//   - MongoDB             — used when MONGODB_URI is set, i.e. in production,
//                           where hosts give you no persistent filesystem.
//
// Either way every collection is held in memory and written through on change,
// so all 68 call sites in server.js stay synchronous. That is the whole reason
// swapping in Mongo needed no changes anywhere else in the app.
//
// Each app collection is stored as ONE Mongo document ({ _id: 'recipes',
// docs: [...] }), so a write is a single atomic replaceOne and the on-disk and
// in-Mongo shapes stay identical. The trade is Mongo's 16MB per-document cap —
// thousands of recipes at this shape, since images are URLs and not blobs.
//
// This design assumes a SINGLE server instance: two instances would each hold
// their own cache and clobber each other. That matches how the app is deployed
// (one small always-on service) but rules out scaling out without reworking
// this file to read through to Mongo on every call.
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'pov_cooking'

let mongoClient = null
let mongoDocs = null // the Mongo collection holding one document per app collection
const registry = new Map()

function collection(name) {
  const file = path.join(DATA_DIR, `${name}.json`)
  let cache = null
  // Writes are chained so they land in the order they were made.
  let writes = Promise.resolve()

  function readFile() {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      return []
    }
  }

  function load() {
    if (cache) return cache
    cache = readFile()
    return cache
  }

  function persist() {
    if (mongoDocs) {
      const snapshot = cache.map((doc) => ({ ...doc }))
      writes = writes
        .then(() => mongoDocs.replaceOne({ _id: name }, { _id: name, docs: snapshot }, { upsert: true }))
        .catch((err) => console.error(`[store] could not save "${name}":`, err.message))
      return
    }
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2))
    fs.renameSync(tmp, file)
  }

  const api = {
    all() {
      return load()
    },
    find(predicate) {
      return load().find(predicate) || null
    },
    filter(predicate) {
      return load().filter(predicate)
    },
    findById(id) {
      return load().find((doc) => doc.id === id) || null
    },
    insert(doc) {
      load().push(doc)
      persist()
      return doc
    },
    update(id, changes) {
      const docs = load()
      const index = docs.findIndex((doc) => doc.id === id)
      if (index === -1) return null
      docs[index] = { ...docs[index], ...changes }
      persist()
      return docs[index]
    },
    remove(predicate) {
      const before = load().length
      cache = load().filter((doc) => !predicate(doc))
      persist()
      return before - cache.length
    },
    // --- used by connect()/flush() below, not by application code ---
    _readFile: readFile,
    _adopt(docs) {
      cache = Array.isArray(docs) ? docs : []
    },
    _flush() {
      return writes
    },
  }

  registry.set(name, api)
  return api
}

const collections = {
  recipes: collection('recipes'),
  users: collection('users'),
  saved: collection('saved'),
  tried: collection('tried'),
  pantry: collection('pantry'),
  suggestions: collection('suggestions'),
  mealplans: collection('mealplans'),
  settings: collection('settings'),
  groceryCatalog: collection('groceryCatalog'),
  grocery: collection('grocery'),
}

// Call once at boot, before serving. Without MONGODB_URI this is a no-op and
// the file store is used exactly as before.
async function connect() {
  if (!MONGODB_URI) return { driver: 'files', location: DATA_DIR }

  // Required lazily so file-mode installs do not need the driver at all.
  const { MongoClient } = require('mongodb')
  mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  await mongoClient.connect()
  mongoDocs = mongoClient.db(MONGODB_DB).collection('collections')

  const seeded = []
  for (const [name, api] of registry) {
    const stored = await mongoDocs.findOne({ _id: name })
    if (stored) {
      api._adopt(stored.docs || [])
      continue
    }
    // Nothing in Mongo yet: adopt whatever ships in the repo (the seed
    // cookbook in recipes.json) and write it up, so a fresh cluster starts
    // populated rather than empty.
    const fromRepo = api._readFile()
    api._adopt(fromRepo)
    await mongoDocs.replaceOne({ _id: name }, { _id: name, docs: fromRepo }, { upsert: true })
    if (fromRepo.length) seeded.push(`${name}(${fromRepo.length})`)
  }

  return { driver: 'mongodb', location: MONGODB_DB, seeded }
}

// Let in-flight writes land before the process exits.
async function flush() {
  await Promise.all([...registry.values()].map((api) => api._flush()))
}

async function close() {
  await flush()
  if (mongoClient) await mongoClient.close()
}

module.exports = { ...collections, connect, flush, close }
