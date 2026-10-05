import React from 'react'
import { Link } from 'react-router-dom'
import { totalTimeText } from '../lib/recipeUtils'
import { useAuth } from '../contexts/AuthContext'
import HeartIcon from './HeartIcon'

function safeVideoUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export default function RecipeCard({ recipe, isSaved, onToggleSave, isTried, onToggleTried }) {
  const { user } = useAuth()
  const time = totalTimeText(recipe)
  const videoUrl = safeVideoUrl(recipe.videoUrl)

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
      {(videoUrl || (user && onToggleSave)) && (
        <div className="card-top-actions">
          {videoUrl && (
            <a
              className="card-video-link"
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Watch recipe video"
              aria-label="Watch recipe video"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 10l5-3v10l-5-3v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2z" />
              </svg>
            </a>
          )}
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
        </div>
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
