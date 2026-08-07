import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import ComponentRandomizer from '../components/ComponentRandomizer'
import SpinWheel from '../components/SpinWheel'
import { useAuth } from '../contexts/AuthContext'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// key = stored slot name, mealType = the recipe meal type suggested for it
const SLOTS = [
  { key: 'breakfast', label: 'Breakfast', mealType: 'Breakfast' },
  { key: 'lunch', label: 'Lunch', mealType: 'Lunch' },
  { key: 'dinner', label: 'Dinner', mealType: 'Dinner' },
  { key: 'snack', label: 'Snack', mealType: 'Snack' },
]

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

// Recipes whose meal type matches the slot come first, under their own group.
function RecipeOptions({ recipes, mealType }) {
  const matching = recipes.filter((r) => r.mealType === mealType)
  const others = recipes.filter((r) => r.mealType !== mealType)
  return (
    <>
      {matching.length > 0 && (
        <optgroup label={`${mealType} recipes`}>
          {matching.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </optgroup>
      )}
      {others.length > 0 && (
        <optgroup label={matching.length ? 'Other recipes' : 'All recipes'}>
          {others.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </optgroup>
      )}
    </>
  )
}

export default function MealPlan() {
  const { token } = useAuth()
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [days, setDays] = useState({})
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wheelPick, setWheelPick] = useState(null)
  const [wheelDay, setWheelDay] = useState('')
  const [wheelSlot, setWheelSlot] = useState('dinner')

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

  function slotIds(dayIndex, slotKey) {
    return days[dayIndex]?.[slotKey] || []
  }

  function addToSlot(dayIndex, slotKey, recipeId) {
    if (!recipeId) return
    const current = slotIds(dayIndex, slotKey)
    if (current.includes(recipeId)) return
    persist({
      ...days,
      [dayIndex]: { ...(days[dayIndex] || {}), [slotKey]: [...current, recipeId] },
    })
  }

  function removeFromSlot(dayIndex, slotKey, recipeId) {
    persist({
      ...days,
      [dayIndex]: {
        ...(days[dayIndex] || {}),
        [slotKey]: slotIds(dayIndex, slotKey).filter((id) => id !== recipeId),
      },
    })
  }

  const plannedCount = Object.values(days).reduce(
    (total, slots) => total + Object.values(slots || {}).reduce((n, ids) => n + (ids?.length || 0), 0),
    0
  )

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
              ? 'Nothing planned this week yet — fill in a meal below or use a randomizer for ideas.'
              : `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned this week.`}
          </p>
          <div className="week-grid">
            {DAY_NAMES.map((name, dayIndex) => {
              const date = addDays(weekStart, dayIndex)
              const isToday = toKey(date) === todayKey
              return (
                <div key={name} className={`day-panel ${isToday ? 'today' : ''}`}>
                  <div className="day-title">
                    {name} <span className="muted small">{shortDate(date)}</span>
                  </div>
                  {SLOTS.map((slot) => {
                    const ids = slotIds(dayIndex, slot.key)
                    return (
                      <div key={slot.key} className="slot">
                        <div className="slot-label">{slot.label}</div>
                        {ids.length > 0 && (
                          <ul className="day-list">
                            {ids.map((id) => (
                              <li key={id}>
                                {recipeById[id] ? (
                                  <Link to={`/recipes/${id}`}>{recipeById[id].title}</Link>
                                ) : (
                                  <span className="muted">Removed recipe</span>
                                )}
                                <button
                                  type="button"
                                  className="remove-button"
                                  onClick={() => removeFromSlot(dayIndex, slot.key, id)}
                                  aria-label={`Remove from ${name} ${slot.label}`}
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <select
                          className="slot-add"
                          value=""
                          onChange={(e) => addToSlot(dayIndex, slot.key, e.target.value)}
                          aria-label={`Add a recipe to ${name} ${slot.label}`}
                        >
                          <option value="">+ Add</option>
                          <RecipeOptions recipes={recipes} mealType={slot.mealType} />
                        </select>
                      </div>
                    )
                  })}
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
                <select value={wheelDay} onChange={(e) => setWheelDay(e.target.value)} aria-label="Day to add to">
                  <option value="">Day…</option>
                  {DAY_NAMES.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
                <select value={wheelSlot} onChange={(e) => setWheelSlot(e.target.value)} aria-label="Meal to add to">
                  {SLOTS.map((slot) => (
                    <option key={slot.key} value={slot.key}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="primary"
                  disabled={wheelDay === ''}
                  onClick={() => {
                    addToSlot(Number(wheelDay), wheelSlot, wheelPick.id)
                    setWheelDay('')
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
