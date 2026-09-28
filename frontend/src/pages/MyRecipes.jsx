import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import ConfirmModal from '../components/ConfirmModal'
import PencilIcon from '../components/PencilIcon'
import RecipeForm from '../components/RecipeForm'
import TrashIcon from '../components/TrashIcon'
import { useAuth } from '../contexts/AuthContext'

// A stripped-down version of the Admin recipe manager, scoped to the recipes
// a regular user has added for themselves. No import-from-link, no grocery
// catalog, no "latest attempt" picker — those stay admin-only tools for
// curating the shared cookbook. Personal recipes never need admin approval:
// they're only ever visible to the person who added them.
export default function MyRecipes() {
  const { user, token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [recipes, setRecipes] = useState([])
  const [editing, setEditing] = useState(null) // 'new' | recipe object | null
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  function refresh() {
    return api
      .getRecipes(token)
      .then(({ recipes }) => setRecipes(recipes.filter((r) => r.personal && r.createdBy === user.id)))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Support /my-recipes?edit=<id> deep links from the recipe detail page.
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

  function requestDelete(recipe) {
    setPendingDelete(recipe)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleteBusy(true)
    try {
      await api.deleteRecipe(token, pendingDelete.id)
      setNotice(`Deleted “${pendingDelete.title}”`)
      setPendingDelete(null)
      await refresh()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>{user.name ? `${user.name}’s Recipes` : 'My Recipes'}</h1>
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
            context="personal"
          />
        </div>
      ) : (
        <div className="panel">
          <h2>Your recipes ({recipes.length})</h2>
          <p className="muted small">
            Only visible to you — never shown to other users, and not part of the shared cookbook.
          </p>
          {recipes.length === 0 ? (
            <p className="muted small">Nothing here yet — add your first recipe above.</p>
          ) : (
            <ul className="admin-list">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                  <span className="admin-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setEditing(recipe)}
                      aria-label={`Edit ${recipe.title}`}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => requestDelete(recipe)}
                      aria-label={`Delete ${recipe.title}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {pendingDelete && (
        <ConfirmModal
          title="Delete recipe?"
          items={[pendingDelete.title]}
          message="This cannot be undone."
          confirmLabel="Delete"
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
