import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeSpinner from '../components/RecipeSpinner'
import TagFilter from '../components/TagFilter'
import { useAuth } from '../contexts/AuthContext'
import { MEAL_TYPES, matchesQuery, totalMinutes, totalTimeText } from '../lib/recipeUtils'
import { usePageSize } from '../lib/usePageSize'
import { useSaved } from '../lib/useSaved'
import { useTried } from '../lib/useTried'

const DURATIONS = [
  { value: '', label: 'Any time' },
  { value: '15', label: '≤ 15 min' },
  { value: '30', label: '≤ 30 min' },
  { value: '45', label: '≤ 45 min' },
  { value: '60', label: '≤ 1 hour' },
  { value: '120', label: '≤ 2 hours' },
]

function FeaturedBanner({ recipe }) {
  const time = totalTimeText(recipe)
  return (
    <div className="featured">
      <div className="featured-label">Latest recipe attempt</div>
      <Link to={`/recipes/${recipe.id}`} className="featured-card">
        <span className="featured-media">
          {recipe.image ? <img src={recipe.image} alt="" /> : recipe.title.charAt(0).toUpperCase()}
        </span>
        <span className="featured-body">
          <span className="featured-title">{recipe.title}</span>
          {recipe.description && <span className="featured-description">{recipe.description}</span>}
          <span className="card-meta">
            {recipe.mealType && <span>{recipe.mealType}</span>}
            {time && <span>{time}</span>}
            {recipe.cuisine && <span>{recipe.cuisine}</span>}
          </span>
        </span>
      </Link>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState(null)
  const [featured, setFeatured] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [mealType, setMealType] = useState('')
  const [maxTime, setMaxTime] = useState('')
  const [tags, setTags] = useState([])
  const [savedOnly, setSavedOnly] = useState(false)
  const [neverCooked, setNeverCooked] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = usePageSize()
  const { savedIds, toggleSave } = useSaved()
  const { triedIds, toggleTried } = useTried()

  useEffect(() => {
    api
      .getRecipes()
      .then(({ recipes }) => setRecipes(recipes))
      .catch((err) => setError(err.message))
    api
      .getFeatured()
      .then(({ recipe }) => setFeatured(recipe))
      .catch(() => setFeatured(null))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, cuisine, mealType, maxTime, tags, savedOnly, neverCooked, pageSize])

  if (error) return <p className="error">Could not load recipes: {error}. Is the backend running?</p>
  if (!recipes) return <p className="muted">Loading recipes…</p>

  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))].sort()
  const allTags = [...new Set(recipes.flatMap((r) => r.tags || []).filter(Boolean))].sort()

  const matching = recipes.filter((r) => {
    if (savedOnly && !savedIds.has(r.id)) return false
    if (neverCooked && triedIds.has(r.id)) return false
    if (mealType && r.mealType !== mealType) return false
    if (!matchesQuery(r, query)) return false
    if (cuisine && r.cuisine !== cuisine) return false
    if (tags.length && !tags.every((t) => (r.tags || []).includes(t))) return false
    if (maxTime) {
      const total = totalMinutes(r)
      if (total == null || total > Number(maxTime)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = matching.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const filtersActive = Boolean(
    query || cuisine || mealType || maxTime || tags.length || savedOnly || neverCooked
  )

  return (
    <section>
      {featured && <FeaturedBanner recipe={featured} />}
      <div className="page-header">
        <h1>All Recipes</h1>
        <span className="muted small">
          {matching.length} of {recipes.length}
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
        <select value={mealType} onChange={(e) => setMealType(e.target.value)} aria-label="Filter by meal type">
          <option value="">All meal types</option>
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
        <TagFilter tags={allTags} selected={tags} onChange={setTags} />
        {user && (
          <>
            <button
              type="button"
              className={`chip ${savedOnly ? 'active' : ''}`}
              onClick={() => setSavedOnly(!savedOnly)}
              title="Show only recipes you saved"
            >
              Saved only
            </button>
            <button
              type="button"
              className={`chip ${neverCooked ? 'active' : ''}`}
              onClick={() => setNeverCooked(!neverCooked)}
              title="Show only recipes you have never cooked"
            >
              Never cooked
            </button>
          </>
        )}
        {filtersActive && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setQuery('')
              setCuisine('')
              setMealType('')
              setMaxTime('')
              setTags([])
              setSavedOnly(false)
              setNeverCooked(false)
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
      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            Previous
          </button>
          <span className="muted small">
            Page {currentPage} of {totalPages}
          </span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
            Next
          </button>
        </div>
      )}
      <RecipeSpinner recipes={recipes} filteredRecipes={matching} filtersActive={filtersActive} />
    </section>
  )
}
