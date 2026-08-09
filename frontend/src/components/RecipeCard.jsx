import React from 'react'
import { Link } from 'react-router-dom'
import { totalTimeText } from '../lib/recipeUtils'
import { useAuth } from '../contexts/AuthContext'
import HeartIcon from './HeartIcon'

export default function RecipeCard({ recipe, isSaved, onToggleSave, isTried, onToggleTried }) {
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
        {isTried && <span className="tried-badge">Tried</span>}
      </Link>
      {user && onToggleSave && (
        <button
          className={`heart-button card-save ${isSaved ? 'saved' : ''}`}
          onClick={() => onToggleSave(recipe)}
          title={isSaved ? 'Remove from saved' : 'Save recipe'}
          aria-label={isSaved ? 'Remove from saved' : 'Save recipe'}
          aria-pressed={isSaved}
        >
          <HeartIcon filled={isSaved} />
        </button>
      )}
      <div className="card-body">
        <Link to={`/recipes/${recipe.id}`} className="card-title">
          {recipe.title}
        </Link>
        <div className="card-meta">
          {recipe.mealType && <span>{recipe.mealType}</span>}
          {time && <span>{time}</span>}
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
        {user && onToggleTried && (
          <div className="card-actions">
            <button className={`pill ${isTried ? 'active' : ''}`} onClick={() => onToggleTried(recipe)}>
              {isTried ? 'Cooked' : 'Mark cooked'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
