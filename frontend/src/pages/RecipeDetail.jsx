import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../api'
import Timer from '../components/Timer'
import { useAuth } from '../contexts/AuthContext'
import { ingredientToText } from '../lib/recipeUtils'
import { useSaved } from '../lib/useSaved'
import { useTried } from '../lib/useTried'

// Checked-off ingredients/steps are remembered per recipe on this device.
function loadChecklist(recipeId) {
  try {
    return JSON.parse(localStorage.getItem(`pov_checklist_${recipeId}`)) || { ingredients: [], steps: [] }
  } catch {
    return { ingredients: [], steps: [] }
  }
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, token } = useAuth()
  const { savedIds, toggleSave } = useSaved()
  const { triedIds, toggleTried } = useTried()
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState(null)
  const [checked, setChecked] = useState(() => loadChecklist(id))

  useEffect(() => {
    api
      .getRecipe(id)
      .then(({ recipe }) => setRecipe(recipe))
      .catch((err) => setError(err.message))
    setChecked(loadChecklist(id))
  }, [id])

  useEffect(() => {
    localStorage.setItem(`pov_checklist_${id}`, JSON.stringify(checked))
  }, [id, checked])

  function toggleItem(kind, index) {
    setChecked((prev) => {
      const list = prev[kind].includes(index) ? prev[kind].filter((i) => i !== index) : [...prev[kind], index]
      return { ...prev, [kind]: list }
    })
  }

  function resetChecklist() {
    setChecked({ ingredients: [], steps: [] })
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return
    await api.deleteRecipe(token, recipe.id)
    navigate('/')
  }

  if (error) return <p className="error">{error}</p>
  if (!recipe) return <p className="muted">Loading…</p>

  const isSaved = savedIds.has(recipe.id)
  const ingredients = recipe.ingredients || []
  const steps = recipe.steps || []
  const anyChecked = checked.ingredients.length > 0 || checked.steps.length > 0
  const timerPresets = [
    recipe.cookTimeMinutes ? { label: 'Cook', minutes: recipe.cookTimeMinutes } : null,
    recipe.prepTimeMinutes ? { label: 'Prep', minutes: recipe.prepTimeMinutes } : null,
  ].filter(Boolean)

  return (
    <article className="detail">
      <Link to="/" className="muted">
        ← All recipes
      </Link>
      <div className="detail-header">
        <h1>{recipe.title}</h1>
        <div className="detail-actions">
          {user && (
            <>
              <button className={`pill large ${isSaved ? 'active' : ''}`} onClick={() => toggleSave(recipe)}>
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                className={`pill large ${triedIds.has(recipe.id) ? 'active' : ''}`}
                onClick={() => toggleTried(recipe)}
              >
                {triedIds.has(recipe.id) ? 'Cooked' : 'Mark cooked'}
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <Link className="button" to={`/admin?edit=${recipe.id}`}>
                Edit
              </Link>
              <button className="danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {recipe.description && <p className="detail-description">{recipe.description}</p>}

      <div className="detail-meta">
        {recipe.mealType && <span>{recipe.mealType}</span>}
        {recipe.cuisine && <span>{recipe.cuisine}</span>}
        {recipe.servings != null && <span>Serves {recipe.servings}</span>}
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes} min</span>}
      </div>
      {recipe.tags?.length > 0 && (
        <div className="tag-row">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {recipe.image && <img className="detail-image" src={recipe.image} alt={recipe.title} />}

      <Timer presets={timerPresets} />

      <div className="detail-columns">
        <section>
          <div className="list-header">
            <h2>
              Ingredients{' '}
              <span className="muted small">
                {checked.ingredients.length}/{ingredients.length}
              </span>
            </h2>
          </div>
          <ul className="check-list">
            {ingredients.map((ing, i) => (
              <li key={i}>
                <label className={checked.ingredients.includes(i) ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    checked={checked.ingredients.includes(i)}
                    onChange={() => toggleItem('ingredients', i)}
                  />
                  <span>{ingredientToText(ing)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <div className="list-header">
            <h2>
              Steps{' '}
              <span className="muted small">
                {checked.steps.length}/{steps.length}
              </span>
            </h2>
            {anyChecked && (
              <button type="button" className="link-button small" onClick={resetChecklist}>
                Reset checklist
              </button>
            )}
          </div>
          <ol className="check-list steps">
            {steps.map((step, i) => (
              <li key={i}>
                <label className={checked.steps.includes(i) ? 'checked' : ''}>
                  <input type="checkbox" checked={checked.steps.includes(i)} onChange={() => toggleItem('steps', i)} />
                  <span>{step}</span>
                </label>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes && (
        <section>
          <h2>Notes</h2>
          <p>{recipe.notes}</p>
        </section>
      )}
      {recipe.source?.url && (
        <p className="muted">
          Source:{' '}
          <a href={recipe.source.url} target="_blank" rel="noreferrer">
            {recipe.source.name || recipe.source.url}
          </a>
        </p>
      )}
    </article>
  )
}
