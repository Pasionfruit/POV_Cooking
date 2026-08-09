import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import ComponentRandomizer from '../components/ComponentRandomizer'
import SpinWheel from '../components/SpinWheel'
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
  const [wheelPick, setWheelPick] = useState(null)

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

  function addToDay(dayIndex, recipeId) {
    if (!recipeId) return
    const current = days[dayIndex] || []
    if (current.includes(recipeId)) return
    persist({ ...days, [dayIndex]: [...current, recipeId] })
  }

  function removeFromDay(dayIndex, recipeId) {
    persist({ ...days, [dayIndex]: (days[dayIndex] || []).filter((id) => id !== recipeId) })
  }

  const plannedCount = Object.values(days).reduce((n, ids) => n + (ids?.length || 0), 0)

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
                    {(days[i] || []).map((id) => (
                      <li key={id}>
                        {recipeById[id] ? (
                          <Link to={`/recipes/${id}`}>{recipeById[id].title}</Link>
                        ) : (
                          <span className="muted">Removed recipe</span>
                        )}
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeFromDay(i, id)}
                          aria-label={`Remove from ${name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <select
                    className="slot-add"
                    value=""
                    onChange={(e) => addToDay(i, e.target.value)}
                    aria-label={`Add recipe to ${name}`}
                  >
                    <option value="">+ Add recipe</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          <div className="panel">
            <h2>Build a meal</h2>
            <p className="muted small">Roll a combination of components when you want to improvise.</p>
            <ComponentRandomizer />
          </div>

          <div className="panel wheel-panel">
            <h2>Pick a recipe at random</h2>
            <SpinWheel recipes={recipes} onResult={setWheelPick} />
            {wheelPick && (
              <div className="wheel-result">
                <span>
                  Result: <Link to={`/recipes/${wheelPick.id}`}>{wheelPick.title}</Link>
                </span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value !== '') addToDay(Number(e.target.value), wheelPick.id)
                  }}
                  aria-label="Add wheel result to a day"
                >
                  <option value="">Add to day…</option>
                  {DAY_NAMES.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
