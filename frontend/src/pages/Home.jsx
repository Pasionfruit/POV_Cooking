import React, { useEffect, useState } from 'react'
import * as api from '../api'
import RecipeCard from '../components/RecipeCard'
import { useAuth } from '../contexts/AuthContext'
import { matchesQuery, totalMinutes } from '../lib/recipeUtils'
import { useSaved } from '../lib/useSaved'

const DURATIONS = [
  { value: '', label: 'Any time' },
  { value: '15', label: '≤ 15 min' },
  { value: '30', label: '≤ 30 min' },
  { value: '45', label: '≤ 45 min' },
  { value: '60', label: '≤ 1 hour' },
  { value: '120', label: '≤ 2 hours' },
]

export default function Home() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [maxTime, setMaxTime] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  const { savedIds, toggleSave } = useSaved()

  useEffect(() => {
    api
      .getRecipes()
      .then(({ recipes }) => setRecipes(recipes))
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="error">Could not load recipes: {error}. Is the backend running?</p>
  if (!recipes) return <p className="muted">Loading recipes…</p>

  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))].sort()

  const visible = recipes.filter((r) => {
    if (savedOnly && !savedIds.has(r.id)) return false
    if (!matchesQuery(r, query)) return false
    if (cuisine && r.cuisine !== cuisine) return false
    if (maxTime) {
      const total = totalMinutes(r)
      if (total == null || total > Number(maxTime)) return false
    }
    return true
  })

  const filtersActive = query || cuisine || maxTime || savedOnly

  return (
    <section>
      <div className="page-header">
        <h1>All Recipes</h1>
        <span className="muted small">
          {visible.length} of {recipes.length}
        </span>
      </div>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search title, tag, ingredient…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} aria-label="Filter by cuisine">
          <option value="">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={maxTime} onChange={(e) => setMaxTime(e.target.value)} aria-label="Filter by total time">
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {user && (
          <button
            type="button"
            className={`chip ${savedOnly ? 'active' : ''}`}
            onClick={() => setSavedOnly(!savedOnly)}
            title="Show only recipes you saved"
          >
            ♥ Saved
          </button>
        )}
        {filtersActive && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setQuery('')
              setCuisine('')
              setMaxTime('')
            }}
          >
            Clear
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="muted">No recipes match these filters.</p>
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
