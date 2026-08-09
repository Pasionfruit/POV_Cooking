import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import BarcodeIcon from '../components/BarcodeIcon'
import BarcodeScanner from '../components/BarcodeScanner'
import { useAuth } from '../contexts/AuthContext'
import { STAPLES, daysUntilExpiry, expiryLabel, expiryStatus, matchRecipes } from '../lib/pantryMatch'

const LOCATIONS = ['Fridge', 'Freezer', 'Pantry']
const TYPES = [
  'Produce',
  'Dairy',
  'Meat',
  'Seafood',
  'Grains',
  'Bakery',
  'Canned',
  'Condiment',
  'Spice',
  'Snack',
  'Beverage',
  'Other',
]

// Duration-left buckets, matched against daysUntilExpiry.
const DURATIONS = [
  { value: '', label: 'Any duration', test: () => true },
  { value: 'expired', label: 'Expired', test: (d) => d < 0 },
  { value: '2', label: 'Use within 2 days', test: (d) => d >= 0 && d <= 2 },
  { value: '7', label: 'Use within a week', test: (d) => d >= 0 && d <= 7 },
  { value: '30', label: 'Use within a month', test: (d) => d >= 0 && d <= 30 },
  { value: 'later', label: 'More than a month left', test: (d) => d > 30 },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  name: '',
  location: 'Fridge',
  type: 'Produce',
  quantity: '',
  purchasedAt: today(),
  shelfLifeDays: 7,
  notes: '',
  barcode: '',
}

function ItemForm({ initial, onSubmit, onCancel, busy, prefill, onScan }) {
  const [fields, setFields] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    setFields(initial || EMPTY_FORM)
  }, [initial])

  // A scanned product drops straight into the fields, leaving the rest as-is
  // so the user only has to confirm where it goes.
  useEffect(() => {
    if (prefill) setFields((f) => ({ ...f, ...prefill }))
  }, [prefill])

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
        Type
        <select value={fields.type} onChange={(e) => set('type', e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
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
      {fields.barcode && <p className="muted small barcode-note">Barcode {fields.barcode}</p>}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        {onScan && (
          <button
            type="button"
            className="icon-button scan-button"
            onClick={onScan}
            title="Scan a barcode"
            aria-label="Scan a barcode"
          >
            <BarcodeIcon />
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {initial ? 'Save changes' : 'Add item'}
        </button>
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
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState(null)
  const [prefill, setPrefill] = useState(null)

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

  async function handleAddSamples() {
    setBusy(true)
    setError(null)
    try {
      await api.addSamplePantry(token)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDetected(code) {
    setScanning(false)
    setScanStatus({ tone: 'muted', text: `Looking up ${code}…` })
    try {
      const product = await api.lookupBarcode(token, code)
      setEditing(null)
      setPrefill({
        name: product.brand ? `${product.brand} ${product.name}` : product.name,
        quantity: product.quantity || '',
        type: product.type || 'Other',
        barcode: product.code,
      })
      setScanStatus({ tone: 'notice', text: `Found “${product.name}” — check the details and add it.` })
    } catch (err) {
      // Still worth adding by hand, so keep the code in the form.
      setPrefill({ barcode: code, name: '' })
      setScanStatus({ tone: 'error', text: `${err.message} (barcode ${code}) — type the name yourself.` })
    }
  }

  const withExpiry = items
    .map((item) => ({ item, days: daysUntilExpiry(item) }))
    .sort((a, b) => a.days - b.days)
  const expiringSoon = withExpiry.filter(({ days }) => days <= 2)

  const durationRule = DURATIONS.find((d) => d.value === duration) || DURATIONS[0]
  const needle = query.trim().toLowerCase()
  const visible = withExpiry.filter(({ item, days }) => {
    if (location && item.location !== location) return false
    if (type && (item.type || 'Other') !== type) return false
    if (!durationRule.test(days)) return false
    if (needle && !item.name.toLowerCase().includes(needle)) return false
    return true
  })
  const filtersActive = Boolean(query || location || type || duration)

  const matches = matchRecipes(recipes, items)
  const ready = matches.filter((m) => m.missing.length === 0)
  const almost = matches.filter((m) => m.missing.length > 0 && m.missing.length <= 2)

  return (
    <section>
      <div className="page-header">
        <h1>Pantry &amp; Fridge</h1>
        <span className="muted small">
          {filtersActive ? `${visible.length} of ${items.length}` : `${items.length} item${items.length === 1 ? '' : 's'}`}
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
        {scanStatus && !editing && <p className={scanStatus.tone === 'muted' ? 'muted small' : scanStatus.tone}>{scanStatus.text}</p>}
        <ItemForm
          initial={
            editing && {
              name: editing.name,
              location: editing.location,
              type: editing.type || 'Other',
              quantity: editing.quantity || '',
              purchasedAt: editing.purchasedAt,
              shelfLifeDays: editing.shelfLifeDays,
              notes: editing.notes || '',
              barcode: editing.barcode || '',
            }
          }
          prefill={editing ? null : prefill}
          onScan={() => {
            setScanStatus(null)
            setPrefill(null)
            setScanning(true)
          }}
          onSubmit={handleSubmit}
          onCancel={editing ? () => setEditing(null) : null}
          busy={busy}
        />
      </div>

      {items.length > 0 && (
        <div className="filters">
          <input
            className="search"
            type="search"
            placeholder="Search items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search pantry items"
          />
          <select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Filter by location">
            <option value="">All locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="Filter by duration left">
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setQuery('')
                setLocation('')
                setType('')
                setDuration('')
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {LOCATIONS.map((group) => {
        const rows = visible.filter(({ item }) => item.location === group)
        if (!rows.length) return null
        return (
          <div key={group} className="panel">
            <h2>{group}</h2>
            <ul className="pantry-list">
              {rows.map(({ item, days }) => (
                <li key={item.id} className={`pantry-item ${expiryStatus(days)}`}>
                  <span className="pantry-name">
                    {item.name}
                    {item.quantity && <span className="muted small"> · {item.quantity}</span>}
                  </span>
                  <span className="pantry-type">{item.type || 'Other'}</span>
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

      {items.length > 0 && visible.length === 0 && <p className="muted">No items match these filters.</p>}

      {items.length === 0 && (
        <div className="panel empty-pantry">
          <p className="muted">Nothing tracked yet — add what’s in your fridge and cupboards above.</p>
          <button type="button" onClick={handleAddSamples} disabled={busy}>
            {busy ? 'Adding…' : 'Fill with sample items'}
          </button>
        </div>
      )}

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

      {scanning && <BarcodeScanner onDetected={handleDetected} onClose={() => setScanning(false)} />}
    </section>
  )
}
