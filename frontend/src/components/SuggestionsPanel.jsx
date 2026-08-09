import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import RecipeForm from './RecipeForm'
import { ingredientToText } from '../lib/recipeUtils'
import { useAuth } from '../contexts/AuthContext'

// Admin review queue for recipes suggested by users.
export default function SuggestionsPanel({ onChange }) {
  const { token } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  function refresh() {
    return api
      .getSuggestions(token)
      .then(({ suggestions }) => setSuggestions(suggestions))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function run(action, message) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setNotice(message)
      setEditing(null)
      await refresh()
      onChange?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const pending = suggestions.filter((s) => s.status === 'pending')
  const reviewed = suggestions.filter((s) => s.status !== 'pending')

  if (!suggestions.length) {
    return (
      <div className="panel">
        <h2>Recipe suggestions</h2>
        <p className="muted">No suggestions yet. Logged-in users can send them from the Suggest page.</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>Recipe suggestions ({pending.length} pending)</h2>
      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <ul className="suggestion-list">
        {[...pending, ...reviewed].map((s) => {
          const isOpen = expanded === s.id
          const isEditing = editing === s.id
          return (
            <li key={s.id} className="suggestion">
              <div className="suggestion-head">
                <button type="button" className="link-button" onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <span className={`caret ${isOpen ? 'open' : ''}`} aria-hidden>
                    ›
                  </span>{' '}
                  {s.recipe.title}
                </button>
                <span className="muted small">from {s.submittedBy}</span>
                <span className={`status-badge ${s.status}`}>{s.status}</span>
                {s.status === 'pending' && (
                  <span className="suggestion-actions">
                    <button type="button" disabled={busy} onClick={() => setEditing(isEditing ? null : s.id)}>
                      {isEditing ? 'Cancel edit' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={busy}
                      onClick={() => run(() => api.approveSuggestion(token, s.id), `Published “${s.recipe.title}”`)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => api.rejectSuggestion(token, s.id), `Rejected “${s.recipe.title}”`)}
                    >
                      Reject
                    </button>
                  </span>
                )}
                {s.status !== 'pending' && (
                  <span className="suggestion-actions">
                    {s.recipeId && <Link className="button" to={`/recipes/${s.recipeId}`}>View</Link>}
                    <button
                      type="button"
                      className="danger"
                      disabled={busy}
                      onClick={() => run(() => api.deleteSuggestion(token, s.id), 'Suggestion removed')}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </div>

              {s.note && <p className="muted small suggestion-note">Note: {s.note}</p>}

              {isEditing ? (
                <RecipeForm
                  initial={s.recipe}
                  busy={busy}
                  submitLabel="Save and approve"
                  cancelLabel="Cancel"
                  onCancel={() => setEditing(null)}
                  onSubmit={(recipe) =>
                    run(async () => {
                      await api.updateSuggestion(token, s.id, recipe)
                      await api.approveSuggestion(token, s.id, recipe)
                    }, `Published “${recipe.title}”`)
                  }
                />
              ) : (
                isOpen && (
                  <div className="suggestion-detail">
                    {s.recipe.description && <p>{s.recipe.description}</p>}
                    <div className="detail-columns">
                      <div>
                        <h4>Ingredients</h4>
                        <ul>
                          {(s.recipe.ingredients || []).map((ing, i) => (
                            <li key={i}>{ingredientToText(ing)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Steps</h4>
                        <ol>
                          {(s.recipe.steps || []).map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                )
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
