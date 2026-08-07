import React, { useEffect, useState } from 'react'
import * as api from '../api'
import RecipeCard from '../components/RecipeCard'
import { matchesQuery } from '../lib/recipeUtils'
import { useSaved } from '../lib/useSaved'

export default function Home() {
  const [recipes, setRecipes] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const { savedIds, toggleSave } = useSaved()

  useEffect(() => {
    api
      .getRecipes()
      .then(({ recipes }) => setRecipes(recipes))
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="error">Could not load recipes: {error}. Is the backend running?</p>
  if (!recipes) return <p className="muted">Loading recipes…</p>

  const visible = recipes.filter((r) => matchesQuery(r, query))

  return (
    <section>
      <div className="page-header">
        <h1>All Recipes</h1>
        <input
          className="search"
          type="search"
          placeholder="Search title, tag, ingredient…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {visible.length === 0 ? (
        <p className="muted">No recipes match “{query}”.</p>
      ) : (
        <div className="card-grid">
          {visible.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} isSaved={savedIds.has(recipe.id)} onToggleSave={toggleSave} />
          ))}
        </div>
      )}
    </section>
  )
}
