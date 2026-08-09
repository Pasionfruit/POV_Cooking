import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import ComponentRandomizer from '../components/ComponentRandomizer'
import RecipeCombobox from '../components/RecipeCombobox'
import { useAuth } from '../contexts/AuthContext'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function shortDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MealPlan() {
  const { token } = useAuth()
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [days, setDays] = useState({})
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const weekKey = toKey(weekStart)
  const todayKey = toKey(new Date())
  const recipeById = Object.fromEntries(recipes.map((r) => [r.id, r]))

  useEffect(() => {
    api.getRecipes().then(({ recipes }) => setRecipes(recipes))
  }, [])

  useEffect(() => {
    setLoading(true)
    api
      .getMealPlan(token, weekKey)
      .then(({ plan }) => setDays(plan?.days || {}))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, weekKey])

  function persist(nextDays) {
    setDays(nextDays)
    api.saveMealPlan(token, { weekStart: weekKey, days: nextDays }).catch((err) => setError(err.message))
  }

  // An entry is a recipe id, or { text } for something the user typed in.
  function addToDay(dayIndex, entry) {
    if (!entry) return
    const current = days[dayIndex] || []
    const duplicate = current.some((e) =>
      typeof entry === 'string'
        ? e === entry
        : typeof e === 'object' && e?.text?.toLowerCase() === entry.text.toLowerCase()
    )
    if (duplicate) return
    persist({ ...days, [dayIndex]: [...current, entry] })
  }

  function removeFromDay(dayIndex, index) {
    persist({ ...days, [dayIndex]: (days[dayIndex] || []).filter((_, i) => i !== index) })
  }

  const plannedCount = Object.values(days).reduce((n, ids) => n + (ids?.length || 0), 0)

  // One random recipe per day, drawn without replacement so a week's picks are
  // distinct whenever there are at least seven recipes to draw from.
  function trustTheAlgorithm() {
    if (recipes.length === 0) return
    if (plannedCount > 0 && !window.confirm('Replace this week’s plan with one random recipe per day?')) return
    const pool = []
    const next = {}
    DAY_NAMES.forEach((_, i) => {
      if (pool.length === 0) pool.push(...recipes)
      next[i] = [pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id]
    })
    persist(next)
  }

  return (
    <section>
      <div className="page-header">
        <h1>Meal Plan</h1>
        <div className="week-nav">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            ←
          </button>
          <span className="week-label">
            {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}
          </span>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            →
          </button>
          {weekKey !== toKey(mondayOf(new Date())) && (
            <button type="button" className="link-button" onClick={() => setWeekStart(mondayOf(new Date()))}>
              This week
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading week…</p>
      ) : (
        <>
          <p className="muted small">
            {plannedCount === 0
              ? 'Nothing planned this week yet — add recipes below or use a randomizer for ideas.'
              : `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned this week.`}
          </p>
          <div className="week-grid">
            {DAY_NAMES.map((name, i) => {
              const date = addDays(weekStart, i)
              const isToday = toKey(date) === todayKey
              return (
                <div key={name} className={`day-panel ${isToday ? 'today' : ''}`}>
                  <div className="day-title">
                    {name} <span className="muted small">{shortDate(date)}</span>
                  </div>
                  <ul className="day-list">
                    {(days[i] || []).map((entry, index) => (
                      <li key={index}>
                        {typeof entry === 'string' ? (
                          recipeById[entry] ? (
                            <Link to={`/recipes/${entry}`}>{recipeById[entry].title}</Link>
                          ) : (
                            <span className="muted">Removed recipe</span>
                          )
                        ) : (
                          <span>{entry.text}</span>
                        )}
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeFromDay(i, index)}
                          aria-label={`Remove from ${name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <RecipeCombobox
                    recipes={recipes}
                    onAdd={(entry) => addToDay(i, entry)}
                    label={`Add a meal to ${name}`}
                  />
                </div>
              )
            })}
          </div>

          <div className="panel algorithm-panel">
            <button type="button" className="primary" onClick={trustTheAlgorithm} disabled={recipes.length === 0}>
              Trust the Algorithm
            </button>
            <p className="muted small">
              Fills every day of {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))} with one random recipe,
              replacing whatever is planned.
            </p>
          </div>

          <div className="panel">
            <h2>Build a meal</h2>
            <p className="muted small">Roll a combination of components when you want to improvise.</p>
            <ComponentRandomizer />
          </div>
        </>
      )}
    </section>
  )
}
