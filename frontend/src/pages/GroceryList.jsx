import React, { useEffect, useState } from 'react'
import * as api from '../api'
import ItemCombobox from '../components/ItemCombobox'
import { useAuth } from '../contexts/AuthContext'

// A single row's quantity is edited inline and only saved on blur/Enter, so
// typing doesn't fire a request per keystroke. Local state re-syncs whenever
// the item itself changes (e.g. after a refresh following another edit).
function GroceryRow({ item, onToggle, onSaveQuantity, onDelete }) {
  const [quantity, setQuantity] = useState(item.quantity || '')

  useEffect(() => {
    setQuantity(item.quantity || '')
  }, [item.id, item.quantity])

  function commit() {
    const trimmed = quantity.trim()
    if (trimmed !== (item.quantity || '')) onSaveQuantity(item, trimmed)
  }

  return (
    <li className={`grocery-item ${item.checked ? 'checked' : ''}`}>
      <label className="grocery-check">
        <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)} />
        <span className="grocery-name">
          {item.name}
          {item.category && <span className="pantry-type">{item.category}</span>}
        </span>
      </label>
      <input
        className="grocery-quantity"
        type="text"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        placeholder="Qty"
        aria-label={`Quantity for ${item.name}`}
      />
      <button type="button" className="remove-button" onClick={() => onDelete(item)} aria-label={`Remove ${item.name}`}>
        ×
      </button>
    </li>
  )
}

export default function GroceryList() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function refresh() {
    return api
      .getGroceryList(token)
      .then(({ items }) => setItems(items))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([refresh(), api.getGroceryCatalog(token).then(({ items }) => setCatalog(items))]).finally(() =>
      setLoading(false)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const catalogById = Object.fromEntries(catalog.map((c) => [c.id, c]))

  // An entry is a catalog item id, or { text } for something typed by hand.
  function handleAdd(entry) {
    const isCatalog = typeof entry === 'string'
    const name = isCatalog ? catalogById[entry]?.name : entry.text.trim()
    if (!name) return
    const duplicate = items.some(
      (item) =>
        !item.checked &&
        (isCatalog ? item.catalogItemId === entry : !item.catalogItemId && item.name.toLowerCase() === name.toLowerCase())
    )
    if (duplicate) return
    api
      .addGroceryItem(token, { name, catalogItemId: isCatalog ? entry : null })
      .then(refresh)
      .catch((err) => setError(err.message))
  }

  function persist(item, changes) {
    const payload = { name: item.name, catalogItemId: item.catalogItemId, quantity: item.quantity, checked: item.checked, ...changes }
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...changes } : i)))
    api.updateGroceryItem(token, item.id, payload).catch((err) => {
      setError(err.message)
      refresh()
    })
  }

  function handleToggle(item) {
    persist(item, { checked: !item.checked })
  }

  function handleSaveQuantity(item, quantity) {
    persist(item, { quantity: quantity || null })
  }

  function handleDelete(item) {
    setItems((list) => list.filter((i) => i.id !== item.id))
    api.deleteGroceryItem(token, item.id).catch((err) => {
      setError(err.message)
      refresh()
    })
  }

  function handleClearChecked() {
    const checkedItems = items.filter((i) => i.checked)
    if (checkedItems.length === 0) return
    setItems((list) => list.filter((i) => !i.checked))
    Promise.all(checkedItems.map((i) => api.deleteGroceryItem(token, i.id))).catch((err) => {
      setError(err.message)
      refresh()
    })
  }

  const uncheckedCount = items.filter((i) => !i.checked).length
  const checkedCount = items.length - uncheckedCount
  // Unchecked items first (in the order added), checked ones sink to the
  // bottom so they're still visible — a receipt of what you've grabbed.
  const sorted = [...items].sort((a, b) => Number(a.checked) - Number(b.checked))

  return (
    <section>
      <div className="page-header">
        <h1>Grocery List</h1>
        <span className="muted small">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="panel">
        <h2>Add an item</h2>
        <ItemCombobox
          items={catalog}
          getLabel={(c) => c.name}
          onAdd={handleAdd}
          label="Add a grocery item"
          placeholder="+ Add item or type your own"
        />
      </div>

      {loading ? (
        <p className="muted">Loading your list…</p>
      ) : items.length === 0 ? (
        <p className="muted">Nothing on your list yet — add items above.</p>
      ) : (
        <>
          <div className="list-summary">
            <p className="muted small">
              {uncheckedCount} to get{checkedCount > 0 ? `, ${checkedCount} checked off` : ''}.
            </p>
            {checkedCount > 0 && (
              <button type="button" onClick={handleClearChecked}>
                Clear checked
              </button>
            )}
          </div>
          <div className="panel">
            <ul className="grocery-list">
              {sorted.map((item) => (
                <GroceryRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onSaveQuantity={handleSaveQuantity}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
