import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'
import { STAPLES, daysUntilExpiry, expiryLabel, expiryStatus, matchRecipes } from '../lib/pantryMatch'

const LOCATIONS = ['Fridge', 'Freezer', 'Pantry']

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM = { name: '', location: 'Fridge', quantity: '', purchasedAt: today(), shelfLifeDays: 7, notes: '' }

function ItemForm({ initial, onSubmit, onCancel, busy }) {
  const [fields, setFields] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    setFields(initial || EMPTY_FORM)
  }, [initial])

  function set(name, value) {
    setFields((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!fields.name.trim()) {
      setError('Give the item a name')
      return
    }
    try {
      await onSubmit({ ...fields, shelfLifeDays: Number(fields.shelfLifeDays) || 7 })
      if (!initial) setFields({ ...EMPTY_FORM, purchasedAt: today(), location: fields.location })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="pantry-form" onSubmit={handleSubmit}>
      <label className="grow">
        Item
        <input value={fields.name} onChange={(e) => set('name', e.target.value)} placeholder="Chicken thighs" />
      </label>
      <label>
        Where
        <select value={fields.location} onChange={(e) => set('location', e.target.value)}>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quantity
        <input value={fields.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="500 g" />
      </label>
      <label>
        Purchased / made
        <input type="date" value={fields.purchasedAt} onChange={(e) => set('purchasedAt', e.target.value)} />
      </label>
      <label>
        Shelf life (days)
        <input
          type="number"
          min="1"
          max="3650"
          value={fields.shelfLifeDays}
          onChange={(e) => set('shelfLifeDays', e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>
          {initial ? 'Save changes' : 'Add item'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function Pantry() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function refresh() {
    return api
      .getPantry(token)
      .then(({ items }) => setItems(items))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    refresh()
    api.getRecipes().then(({ recipes }) => setRecipes(recipes))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleSubmit(item) {
    setBusy(true)
    try {
      if (editing) {
        await api.updatePantryItem(token, editing.id, item)
        setEditing(null)
      } else {
        await api.addPantryItem(token, item)
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item) {
    await api.deletePantryItem(token, item.id)
    if (editing?.id === item.id) setEditing(null)
    refresh()
  }

  const withExpiry = items
    .map((item) => ({ item, days: daysUntilExpiry(item) }))
    .sort((a, b) => a.days - b.days)
  const expiringSoon = withExpiry.filter(({ days }) => days <= 2)
  const matches = matchRecipes(recipes, items)
  const ready = matches.filter((m) => m.missing.length === 0)
  const almost = matches.filter((m) => m.missing.length > 0 && m.missing.length <= 2)

  return (
    <section>
      <div className="page-header">
        <h1>Pantry &amp; Fridge</h1>
        <span className="muted small">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {expiringSoon.length > 0 && (
        <div className="warning-banner">
          <strong>Use soon:</strong>{' '}
          {expiringSoon.map(({ item, days }, i) => (
            <span key={item.id}>
              {i > 0 && ', '}
              {item.name} ({expiryLabel(days).toLowerCase()})
            </span>
          ))}
        </div>
      )}

      <div className="panel">
        <h2>{editing ? `Edit ${editing.name}` : 'Add an item'}</h2>
        <ItemForm
          initial={
            editing && {
              name: editing.name,
              location: editing.location,
              quantity: editing.quantity || '',
              purchasedAt: editing.purchasedAt,
              shelfLifeDays: editing.shelfLifeDays,
              notes: editing.notes || '',
            }
          }
          onSubmit={handleSubmit}
          onCancel={editing ? () => setEditing(null) : null}
          busy={busy}
        />
      </div>

      {LOCATIONS.map((location) => {
        const group = withExpiry.filter(({ item }) => item.location === location)
        if (!group.length) return null
        return (
          <div key={location} className="panel">
            <h2>{location}</h2>
            <ul className="pantry-list">
              {group.map(({ item, days }) => (
                <li key={item.id} className={`pantry-item ${expiryStatus(days)}`}>
                  <span className="pantry-name">
                    {item.name}
                    {item.quantity && <span className="muted small"> · {item.quantity}</span>}
                  </span>
                  <span className={`expiry-badge ${expiryStatus(days)}`}>{expiryLabel(days)}</span>
                  <span className="muted small pantry-date">Added {item.purchasedAt}</span>
                  <span className="pantry-actions">
                    <button type="button" onClick={() => setEditing(item)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(item)}>
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {items.length === 0 && <p className="muted">Nothing tracked yet — add what’s in your fridge and cupboards above.</p>}

      <div className="panel">
        <h2>What can I make right now?</h2>
        <p className="muted small">
          Based on unexpired items you have on hand. {STAPLES.slice(0, -1).join(', ')} and {STAPLES.slice(-1)} are
          assumed to always be in the kitchen.
        </p>
        {items.length === 0 ? (
          <p className="muted">Add pantry items to see what you can cook.</p>
        ) : ready.length === 0 && almost.length === 0 ? (
          <p className="muted">Nothing matches yet — add more items, or a few more recipes to the cookbook.</p>
        ) : (
          <>
            {ready.length > 0 && (
              <>
                <h3 className="match-heading">Ready to cook</h3>
                <ul className="match-list">
                  {ready.map(({ recipe, total }) => (
                    <li key={recipe.id}>
                      <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                      <span className="muted small">all {total} ingredients on hand</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {almost.length > 0 && (
              <>
                <h3 className="match-heading">Almost there</h3>
                <ul className="match-list">
                  {almost.map(({ recipe, missing }) => (
                    <li key={recipe.id}>
                      <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                      <span className="muted small">missing {missing.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
