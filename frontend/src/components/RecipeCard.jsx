import React from 'react'
import { Link } from 'react-router-dom'
import { totalTimeText } from '../lib/recipeUtils'
import { useAuth } from '../contexts/AuthContext'

export default function RecipeCard({ recipe, isSaved, onToggleSave }) {
  const { user } = useAuth()
  const time = totalTimeText(recipe)

  return (
    <div className="card">
      <Link to={`/recipes/${recipe.id}`} className="card-media">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.title} loading="lazy" />
        ) : (
          <span className="card-letter" aria-hidden>
            {recipe.title.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="card-body">
        <div className="card-title-row">
          <Link to={`/recipes/${recipe.id}`} className="card-title">
            {recipe.title}
          </Link>
          {user && onToggleSave && (
            <button className={`save-button ${isSaved ? 'saved' : ''}`} onClick={() => onToggleSave(recipe)}>
              {isSaved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
        <div className="card-meta">
          {time && <span>{time}</span>}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
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
      </div>
    </div>
  )
}
