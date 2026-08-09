import React, { useState } from 'react'
import * as api from '../api'
import RecipeForm from './RecipeForm'
import { useAuth } from '../contexts/AuthContext'

// Paste a link, fetch what the page publishes, then review and correct it
// before anything is written to the cookbook.
export default function UrlImport({ onImported }) {
  const { token } = useAuth()
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [sourceUrl, setSourceUrl] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleFetch(e) {
    e.preventDefault()
    setError(null)
    setPreview(null)
    setFetching(true)
    try {
      const result = await api.importRecipeFromUrl(token, url.trim())
      setPreview(result.recipe)
      setWarnings(result.warnings || [])
      setSourceUrl(result.sourceUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  async function handleSave(recipe) {
    setSaving(true)
    try {
      await api.createRecipe(token, { ...recipe, source: recipe.source || { url: sourceUrl } })
      setPreview(null)
      setWarnings([])
      setUrl('')
      onImported?.(recipe.title)
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    setPreview(null)
    setWarnings([])
    setError(null)
  }

  return (
    <div>
      <p className="muted small">
        Paste a recipe link. Nothing is saved until you review what was found and confirm.
      </p>
      <form className="url-import" onSubmit={handleFetch}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/recipes/garlic-salmon"
          required
        />
        <button type="submit" className="primary" disabled={fetching || !url.trim()}>
          {fetching ? 'Fetching…' : 'Fetch recipe'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {preview && (
        <div className="import-preview">
          <div className="import-preview-head">
            <h3>Check this before saving</h3>
            <span className="muted small">
              from{' '}
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                {(() => {
                  try {
                    return new URL(sourceUrl).hostname.replace(/^www\./, '')
                  } catch {
                    return sourceUrl
                  }
                })()}
              </a>
            </span>
          </div>
          <p className="muted small">
            Found {preview.ingredients?.length || 0} ingredient
            {preview.ingredients?.length === 1 ? '' : 's'} and {preview.steps?.length || 0} step
            {preview.steps?.length === 1 ? '' : 's'}. Edit anything that came through wrong.
          </p>
          {warnings.length > 0 && (
            <ul className="import-warnings">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <RecipeForm
            initial={preview}
            onSubmit={handleSave}
            onCancel={discard}
            busy={saving}
            submitLabel="Looks right — add to cookbook"
            cancelLabel="Discard"
          />
        </div>
      )}
    </div>
  )
}
