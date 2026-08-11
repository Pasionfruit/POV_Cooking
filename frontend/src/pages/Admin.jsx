import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import RecipeForm from '../components/RecipeForm'
import SuggestionsPanel from '../components/SuggestionsPanel'
import UrlImport from '../components/UrlImport'
import { useAuth } from '../contexts/AuthContext'
import { ITEM_TYPES } from '../lib/itemTypes'

const EMPTY_CATALOG_FORM = { name: '', category: 'Produce' }

export default function Admin() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [recipes, setRecipes] = useState([])
  const [featured, setFeaturedState] = useState(null)
  const [editing, setEditing] = useState(null) // 'new' | recipe object | null
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)
  const [catalog, setCatalog] = useState([])
  const [catalogEditing, setCatalogEditing] = useState(null) // catalog item object | null
  const [catalogFields, setCatalogFields] = useState(EMPTY_CATALOG_FORM)
  const [catalogBusy, setCatalogBusy] = useState(false)
  const [catalogError, setCatalogError] = useState(null)

  function refresh() {
    return api.getRecipes().then(({ recipes }) => setRecipes(recipes))
  }

  function refreshCatalog() {
    return api.getGroceryCatalog(token).then(({ items }) => setCatalog(items))
  }

  useEffect(() => {
    refresh()
    refreshCatalog()
    api.getFeatured().then(({ recipe }) => setFeaturedState(recipe))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateFeatured(recipeId) {
    const { recipe } = await api.setFeatured(token, recipeId)
    setFeaturedState(recipe)
    setNotice(recipe ? `“${recipe.title}” is now the latest attempt on the home page` : 'Latest attempt cleared')
  }

  // Support /admin?edit=<id> deep links from the recipe detail page.
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && recipes.length) {
      const recipe = recipes.find((r) => r.id === editId)
      if (recipe) setEditing(recipe)
    }
  }, [searchParams, recipes])

  function closeForm() {
    setEditing(null)
    if (searchParams.get('edit')) setSearchParams({})
  }

  async function handleSubmit(recipe) {
    setBusy(true)
    try {
      if (editing === 'new') {
        await api.createRecipe(token, recipe)
        setNotice(`Added “${recipe.title}”`)
      } else {
        await api.updateRecipe(token, editing.id, recipe)
        setNotice(`Updated “${recipe.title}”`)
      }
      closeForm()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(recipe) {
    if (!window.confirm(`Delete “${recipe.title}”?`)) return
    await api.deleteRecipe(token, recipe.id)
    setNotice(`Deleted “${recipe.title}”`)
    refresh()
  }

  function startCatalogEdit(item) {
    setCatalogEditing(item)
    setCatalogFields({ name: item.name, category: item.category })
    setCatalogError(null)
  }

  function cancelCatalogEdit() {
    setCatalogEditing(null)
    setCatalogFields(EMPTY_CATALOG_FORM)
    setCatalogError(null)
  }

  async function handleCatalogSubmit(e) {
    e.preventDefault()
    setCatalogError(null)
    if (!catalogFields.name.trim()) {
      setCatalogError('Give the item a name')
      return
    }
    setCatalogBusy(true)
    try {
      if (catalogEditing) {
        await api.updateGroceryCatalogItem(token, catalogEditing.id, catalogFields)
      } else {
        await api.createGroceryCatalogItem(token, catalogFields)
      }
      cancelCatalogEdit()
      await refreshCatalog()
    } catch (err) {
      setCatalogError(err.message)
    } finally {
      setCatalogBusy(false)
    }
  }

  async function handleCatalogDelete(item) {
    if (!window.confirm(`Remove “${item.name}” from the grocery catalog?`)) return
    await api.deleteGroceryCatalogItem(token, item.id)
    if (catalogEditing?.id === item.id) cancelCatalogEdit()
    refreshCatalog()
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImportText(String(reader.result))
    reader.readAsText(file)
  }

  async function handleImport() {
    setImportResult(null)
    let payload
    try {
      payload = JSON.parse(importText)
    } catch {
      setImportResult({ error: 'That is not valid JSON' })
      return
    }
    try {
      const result = await api.importRecipes(token, payload)
      setImportResult(result)
      if (result.importedCount) {
        setImportText('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        refresh()
      }
    } catch (err) {
      setImportResult({ error: err.message })
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Admin</h1>
        {!editing && (
          <button className="primary" onClick={() => setEditing('new')}>
            + New recipe
          </button>
        )}
      </div>
      {notice && <p className="notice">{notice}</p>}

      {editing ? (
        <div className="panel">
          <h2>{editing === 'new' ? 'New recipe' : `Edit: ${editing.title}`}</h2>
          <RecipeForm
            initial={editing === 'new' ? null : editing}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            busy={busy}
          />
        </div>
      ) : (
        <>
          <SuggestionsPanel onChange={refresh} />

          <div className="panel">
            <h2>Import from a link</h2>
            <UrlImport
              onImported={(title) => {
                setNotice(`Added “${title}” from the link`)
                refresh()
              }}
            />
          </div>

          <div className="panel">
            <h2>Latest recipe attempt</h2>
            <p className="muted small">Shown at the top of the home page, above All Recipes.</p>
            <div className="featured-picker">
              <select value={featured?.id || ''} onChange={(e) => updateFeatured(e.target.value || null)}>
                <option value="">None</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              {featured && (
                <button type="button" onClick={() => updateFeatured(null)}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Recipes ({recipes.length})</h2>
            <ul className="admin-list">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                  <span className="admin-actions">
                    <button onClick={() => setEditing(recipe)}>Edit</button>
                    <button className="danger" onClick={() => handleDelete(recipe)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <h2>Grocery catalog ({catalog.length})</h2>
            <p className="muted small">
              The items available in the grocery list&rsquo;s add-item dropdown. Anyone can still type a one-off item
              on their own list — this is just the shared picklist.
            </p>
            <form className="pantry-form" onSubmit={handleCatalogSubmit}>
              <label className="grow">
                Item name
                <input
                  value={catalogFields.name}
                  onChange={(e) => setCatalogFields((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Eggs"
                />
              </label>
              <label>
                Category
                <select
                  value={catalogFields.category}
                  onChange={(e) => setCatalogFields((f) => ({ ...f, category: e.target.value }))}
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {catalogError && <p className="error">{catalogError}</p>}
              <div className="form-actions">
                {catalogEditing && (
                  <button type="button" onClick={cancelCatalogEdit}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="primary" disabled={catalogBusy}>
                  {catalogEditing ? 'Save changes' : 'Add item'}
                </button>
              </div>
            </form>
            <ul className="admin-list">
              {catalog.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.name} <span className="muted small">({item.category})</span>
                  </span>
                  <span className="admin-actions">
                    <button onClick={() => startCatalogEdit(item)}>Edit</button>
                    <button className="danger" onClick={() => handleCatalogDelete(item)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {catalog.length === 0 && <p className="muted small">No catalog items yet — add some above.</p>}
          </div>

          <div className="panel">
            <h2>Import recipes from JSON</h2>
            <p className="muted small">
              Upload or paste JSON: a single recipe object, an array of recipes, or {'{ "recipes": [...] }'}. Only{' '}
              <code>title</code> is required — extra fields are kept as-is.
            </p>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFilePick} />
            <textarea
              className="json-editor"
              rows={8}
              placeholder='[{"title": "My recipe", "ingredients": ["…"], "steps": ["…"]}]'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              spellCheck={false}
            />
            <div className="form-actions">
              <button className="primary" onClick={handleImport} disabled={!importText.trim()}>
                Import
              </button>
            </div>
            {importResult?.error && <p className="error">{importResult.error}</p>}
            {importResult && !importResult.error && (
              <div className="notice">
                Imported {importResult.importedCount} recipe{importResult.importedCount === 1 ? '' : 's'}.
                {importResult.skipped?.length > 0 && (
                  <ul>
                    {importResult.skipped.map((s) => (
                      <li key={s.index}>
                        Item {s.index + 1}
                        {s.title ? ` (“${s.title}”)` : ''}: {s.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
