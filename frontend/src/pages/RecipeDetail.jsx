import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'
import { ingredientToText } from '../lib/recipeUtils'
import { useSaved } from '../lib/useSaved'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, token } = useAuth()
  const { savedIds, toggleSave } = useSaved()
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .getRecipe(id)
      .then(({ recipe }) => setRecipe(recipe))
      .catch((err) => setError(err.message))
  }, [id])

  async function handleDelete() {
    if (!window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return
    await api.deleteRecipe(token, recipe.id)
    navigate('/')
  }

  if (error) return <p className="error">{error}</p>
  if (!recipe) return <p className="muted">Loading…</p>

  const isSaved = savedIds.has(recipe.id)

  return (
    <article className="detail">
      <Link to="/" className="muted">
        ← All recipes
      </Link>
      <div className="detail-header">
        <h1>{recipe.title}</h1>
        <div className="detail-actions">
          {user && (
            <button className={`save-button large ${isSaved ? 'saved' : ''}`} onClick={() => toggleSave(recipe)}>
              {isSaved ? '♥ Saved' : '♡ Save'}
            </button>
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

      <div className="detail-columns">
        <section>
          <h2>Ingredients</h2>
          <ul className="ingredients">
            {(recipe.ingredients || []).map((ing, i) => (
              <li key={i}>{ingredientToText(ing)}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Steps</h2>
          <ol className="steps">
            {(recipe.steps || []).map((step, i) => (
              <li key={i}>{step}</li>
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
