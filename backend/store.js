// Data layer: JSON files on disk, one collection per file.
//
// This is the ONLY module that knows how data is persisted. To move to MongoDB
// (or any other document store), reimplement `collection()` with the same
// interface — all(), find(), findById(), insert(), update(), remove() — and
// nothing else in the app changes. Recipes are stored as semi-structured JSON
// documents, so they map 1:1 onto Mongo documents.
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')

function collection(name) {
  const file = path.join(DATA_DIR, `${name}.json`)
  let cache = null

  function load() {
    if (cache) return cache
    try {
      cache = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      cache = []
    }
    return cache
  }

  function persist() {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2))
    fs.renameSync(tmp, file)
  }

  return {
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
  }
}

module.exports = {
  recipes: collection('recipes'),
  users: collection('users'),
  saved: collection('saved'),
  mealplans: collection('mealplans'),
}
