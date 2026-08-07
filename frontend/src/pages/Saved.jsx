import React from 'react'
import { Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import { useSaved } from '../lib/useSaved'
import { useTried } from '../lib/useTried'

export default function Saved() {
  const { savedRecipes, savedIds, toggleSave } = useSaved()
  const { triedIds, toggleTried } = useTried()

  return (
    <section>
      <div className="page-header">
        <h1>Saved Recipes</h1>
      </div>
      {savedRecipes.length === 0 ? (
        <p className="muted">
          Nothing saved yet — browse the <Link to="/">cookbook</Link> and use Save on recipes you like.
        </p>
      ) : (
        <div className="card-grid">
          {savedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isSaved={savedIds.has(recipe.id)}
              onToggleSave={toggleSave}
              isTried={triedIds.has(recipe.id)}
              onToggleTried={toggleTried}
            />
          ))}
        </div>
      )}
    </section>
  )
}
