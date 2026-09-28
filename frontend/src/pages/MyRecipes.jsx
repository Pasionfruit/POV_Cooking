import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import RecipeForm from '../components/RecipeForm'
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

  async function handleDelete(recipe) {
    if (!window.confirm(`Delete “${recipe.title}”?`)) return
    await api.deleteRecipe(token, recipe.id)
    setNotice(`Deleted “${recipe.title}”`)
    refresh()
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
                    <button onClick={() => setEditing(recipe)}>Edit</button>
                    <button className="danger" onClick={() => handleDelete(recipe)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
