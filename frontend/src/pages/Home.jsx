import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import HeartIcon from '../components/HeartIcon'
import DiceIcon from '../components/DiceIcon'
import MealIdeasModal from '../components/MealIdeasModal'
import RecipeCard from '../components/RecipeCard'
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
  const { user, token } = useAuth()
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
  const [personalOnly, setPersonalOnly] = useState(false)
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = usePageSize()
  const { savedIds, toggleSave } = useSaved()
  const { triedIds, toggleTried } = useTried()

  useEffect(() => {
    api
      .getRecipes(token)
      .then(({ recipes }) => setRecipes(recipes))
      .catch((err) => setError(err.message))
    api
      .getFeatured()
      .then(({ recipe }) => setFeatured(recipe))
      .catch(() => setFeatured(null))
  }, [token])

  useEffect(() => {
    setPage(1)
  }, [query, cuisine, mealType, maxTime, tags, savedOnly, neverCooked, personalOnly, pageSize])

  if (error) return <p className="error">Could not load recipes: {error}. Is the backend running?</p>
  if (!recipes) return <p className="muted">Loading recipes…</p>

  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))].sort()
  const allTags = [...new Set(recipes.flatMap((r) => r.tags || []).filter(Boolean))].sort()

  const matching = recipes.filter((r) => {
    if (savedOnly && !savedIds.has(r.id)) return false
    if (neverCooked && triedIds.has(r.id)) return false
    if (personalOnly && !(r.personal && r.createdBy === user?.id)) return false
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
    query || cuisine || mealType || maxTime || tags.length || savedOnly || neverCooked || personalOnly
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
      <div className="filters home-filters">
        <div className="search-bar">
          <input
            className="search"
            type="search"
            aria-label="Search recipes"
            placeholder="Search title, tag, ingredient…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={`chip home-filter-icon ${cuisine || mealType || maxTime || tags.length ? 'active' : ''}`}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-label={filtersOpen ? 'Hide recipe filters' : 'Show recipe filters'}
            title={filtersOpen ? 'Hide recipe filters' : 'Show recipe filters'}
            aria-expanded={filtersOpen}
            aria-controls="recipe-filter-panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 4h18l-7 8v7l-4 2v-9z" />
            </svg>
          </button>
        </div>
        <div className="home-filters-secondary">
          <div className="home-filters-left">
            {user && (
              <button
                type="button"
                className={`chip ${neverCooked ? 'active' : ''}`}
                onClick={() => setNeverCooked(!neverCooked)}
                title="Show only recipes you have never cooked"
                aria-pressed={neverCooked}
              >
                Never cooked
              </button>
            )}
            {user && (
              <button
                type="button"
                className={`chip ${personalOnly ? 'active' : ''}`}
                onClick={() => setPersonalOnly(!personalOnly)}
                title="Show only recipes you added yourself"
                aria-pressed={personalOnly}
              >
                Personal
              </button>
            )}
          </div>
          <div className="home-filters-right">
            {user && (
              <button
                type="button"
                className={`chip home-filter-icon ${savedOnly ? 'active' : ''}`}
                onClick={() => setSavedOnly(!savedOnly)}
                title="Show only recipes you saved"
                aria-label="Saved only"
                aria-pressed={savedOnly}
              >
                <HeartIcon filled size={20} />
              </button>
            )}
            <button
              type="button"
              className="chip home-filter-icon"
              onClick={() => setIdeasOpen(true)}
              aria-label="Open randomizer and meal builder"
              title="Randomize or build a meal"
              aria-haspopup="dialog"
            >
              <DiceIcon />
            </button>
          </div>
        </div>
      </div>
      {filtersOpen && (
        <div id="recipe-filter-panel" className="panel">
          <div className="filters home-filters">
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
              setPersonalOnly(false)
            }}
          >
            Clear
          </button>
        )}
          </div>
        </div>
      )}
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
      {ideasOpen && (
        <MealIdeasModal
          recipes={recipes}
          filteredRecipes={matching}
          filtersActive={filtersActive}
          onClose={() => setIdeasOpen(false)}
        />
      )}
    </section>
  )
}
