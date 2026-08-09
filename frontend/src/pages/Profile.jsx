import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useSaved } from '../lib/useSaved'
import { FONTS, getFont, setFont } from '../lib/font'
import { toggleTheme } from '../lib/theme'
import { downloadMarkdown, savedRecipesToMarkdown } from '../lib/exportMarkdown'

export default function Profile() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const { savedRecipes } = useSaved()
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const [font, setFontState] = useState(getFont)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  function handleLogout() {
    logout()
    navigate('/')
  }

  function handleExport() {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadMarkdown(`pov-cooking-saved-${stamp}.md`, savedRecipesToMarkdown(savedRecipes))
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await api.deleteAccount(token)
      logout()
      navigate('/')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      <div className="panel profile-identity">
        <span className="profile-avatar" aria-hidden>
          {(user.name || user.email || '?').charAt(0).toUpperCase()}
        </span>
        <div>
          <div className="profile-name">{user.name || 'Cook'}</div>
          <div className="muted small">{user.email}</div>
          <div className="muted small">
            {user.role === 'admin' ? 'Admin' : 'Member'} · {savedRecipes.length} saved recipe
            {savedRecipes.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Appearance</h2>
        <p className="muted small">Saved on this device only.</p>

        <div className="pref-row">
          <div>
            <div className="pref-label">Theme</div>
            <div className="muted small">Currently {theme}</div>
          </div>
          <button type="button" onClick={() => setTheme(toggleTheme())}>
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </button>
        </div>

        <div className="pref-row pref-row-stacked">
          <div>
            <div className="pref-label">Font</div>
            <div className="muted small">{FONTS.find((f) => f.value === font)?.hint}</div>
          </div>
          <div className="font-options">
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`chip font-option font-${f.value} ${font === f.value ? 'active' : ''}`}
                onClick={() => setFontState(setFont(f.value))}
                aria-pressed={font === f.value}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Your recipes</h2>
        <div className="pref-row">
          <div>
            <div className="pref-label">Export saved recipes</div>
            <div className="muted small">
              {savedRecipes.length > 0
                ? `Downloads all ${savedRecipes.length} as a single Markdown file.`
                : 'Save a few recipes first and they will show up here.'}
            </div>
          </div>
          <button type="button" onClick={handleExport} disabled={savedRecipes.length === 0}>
            Export .md
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Account</h2>
        {error && <p className="error">{error}</p>}
        <div className="pref-row">
          <div>
            <div className="pref-label">Log out</div>
            <div className="muted small">Ends the session on this device.</div>
          </div>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>

        <div className="pref-row danger-row">
          <div>
            <div className="pref-label">Delete profile</div>
            <div className="muted small">
              Permanently removes your account, saved recipes, pantry, meal plans, and suggestions. Recipes in the
              shared cookbook stay. This cannot be undone.
            </div>
          </div>
          {confirmDelete ? (
            <div className="confirm-actions">
              <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>
              Delete profile
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
