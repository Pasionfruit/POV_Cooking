import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import RecipeForm from '../components/RecipeForm'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABEL = {
  pending: 'Waiting for review',
  approved: 'Published to the cookbook',
  rejected: 'Not accepted',
}

export default function Suggest() {
  const { token, isAdmin } = useAuth()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)
  const [mine, setMine] = useState([])

  function refresh() {
    return api
      .getMySuggestions(token)
      .then(({ suggestions }) => setMine(suggestions))
      .catch(() => setMine([]))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleSubmit(recipe) {
    setBusy(true)
    try {
      await api.submitSuggestion(token, { recipe, note: note || undefined })
      setSent(recipe.title)
      setNote('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Suggest a Recipe</h1>
      </div>
      <p className="muted small">
        Share a recipe for the cookbook. An admin reviews it before it appears on the home page.
        {isAdmin && ' As an admin you can also add recipes directly from the Admin page.'}
      </p>

      {sent && (
        <p className="notice">
          Thanks — “{sent}” was sent for review. You can track it below.
        </p>
      )}

      <div className="panel">
        <h2>Recipe details</h2>
        <label className="suggest-note">
          Note for the admin (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Where it came from, tweaks you made…"
          />
        </label>
        <RecipeForm key={sent || 'new'} onSubmit={handleSubmit} busy={busy} submitLabel="Send for review" />
      </div>

      {mine.length > 0 && (
        <div className="panel">
          <h2>Your suggestions</h2>
          <ul className="admin-list">
            {mine.map((s) => (
              <li key={s.id}>
                <span>
                  {s.status === 'approved' && s.recipeId ? (
                    <Link to={`/recipes/${s.recipeId}`}>{s.recipe.title}</Link>
                  ) : (
                    s.recipe.title
                  )}
                </span>
                <span className={`status-badge ${s.status}`}>{STATUS_LABEL[s.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
