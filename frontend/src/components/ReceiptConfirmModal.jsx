import React, { useState } from 'react'
import { ITEM_TYPES } from '../lib/itemTypes'

const LOCATIONS = ['Fridge', 'Freezer', 'Pantry']

// Where a freshly-bought item of this type most often ends up — just the
// starting guess in the confirmation popup below, not a rule.
const DEFAULT_LOCATION_BY_TYPE = {
  Produce: 'Fridge',
  Dairy: 'Fridge',
  Meat: 'Fridge',
  Seafood: 'Fridge',
  Grains: 'Pantry',
  Bakery: 'Pantry',
  Canned: 'Pantry',
  Condiment: 'Pantry',
  Spice: 'Pantry',
  Snack: 'Pantry',
  Beverage: 'Pantry',
  Other: 'Pantry',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Stable per-row ids so React can track rows correctly as they're removed —
// array index would shift and misattribute edits after a deletion.
let nextRowId = 0

// Nothing from a receipt scan reaches the pantry until it's been through
// here: every guessed item is editable, removable, and only saved once the
// user explicitly confirms.
export default function ReceiptConfirmModal({ items, onConfirm, onCancel, busy }) {
  const [purchasedAt, setPurchasedAt] = useState(today())
  const [rows, setRows] = useState(() =>
    items.map((item) => ({
      rowId: nextRowId++,
      name: item.name,
      quantity: item.quantity || '',
      type: ITEM_TYPES.includes(item.type) ? item.type : 'Other',
      location: DEFAULT_LOCATION_BY_TYPE[item.type] || 'Pantry',
      shelfLifeDays: item.shelfLifeDays || 7,
    }))
  )

  function update(rowId, changes) {
    setRows((list) => list.map((r) => (r.rowId === rowId ? { ...r, ...changes } : r)))
  }

  function remove(rowId) {
    setRows((list) => list.filter((r) => r.rowId !== rowId))
  }

  function handleConfirm() {
    const finalized = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        quantity: r.quantity.trim() || null,
        type: r.type,
        location: r.location,
        purchasedAt,
        shelfLifeDays: Number(r.shelfLifeDays) || 7,
      }))
    onConfirm(finalized)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal receipt-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm receipt items"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <p className="modal-eyebrow">Review before adding</p>
        <h3 className="modal-title">
          {rows.length} item{rows.length === 1 ? '' : 's'} found
        </h3>
        <p className="muted small modal-note">
          Fix anything that read wrong, remove what doesn&rsquo;t belong, then add the rest to your pantry.
        </p>

        <label className="receipt-purchased">
          Purchased on
          <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
        </label>

        {rows.length === 0 ? (
          <p className="muted">Nothing left to add.</p>
        ) : (
          <ul className="receipt-item-list">
            {rows.map((row) => (
              <li key={row.rowId} className="receipt-item-row">
                <input
                  className="receipt-item-name"
                  value={row.name}
                  onChange={(e) => update(row.rowId, { name: e.target.value })}
                  aria-label="Item name"
                />
                <input
                  className="receipt-item-qty"
                  value={row.quantity}
                  onChange={(e) => update(row.rowId, { quantity: e.target.value })}
                  placeholder="Qty"
                  aria-label="Quantity"
                />
                <select
                  className="receipt-item-type"
                  value={row.type}
                  onChange={(e) => update(row.rowId, { type: e.target.value })}
                  aria-label="Type"
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  className="receipt-item-location"
                  value={row.location}
                  onChange={(e) => update(row.rowId, { location: e.target.value })}
                  aria-label="Location"
                >
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <input
                  className="receipt-item-shelf"
                  type="number"
                  min="1"
                  max="3650"
                  value={row.shelfLifeDays}
                  onChange={(e) => update(row.rowId, { shelfLifeDays: e.target.value })}
                  aria-label="Shelf life in days"
                  title="Shelf life (days)"
                />
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => remove(row.rowId)}
                  aria-label={`Remove ${row.name || 'item'}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleConfirm} disabled={busy || rows.length === 0}>
            {busy ? 'Adding…' : `Add ${rows.length} item${rows.length === 1 ? '' : 's'} to pantry`}
          </button>
        </div>
      </div>
    </div>
  )
}
