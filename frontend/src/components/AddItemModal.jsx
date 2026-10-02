import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReceiptIcon from './ReceiptIcon'
import { ITEM_TYPES } from '../lib/itemTypes'

const LOCATIONS = ['Fridge', 'Freezer', 'Pantry']
const TYPES = ITEM_TYPES

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
}

function ItemForm({ initial, onSubmit, onCancel, busy, prefill, onScanReceipt }) {
  const [fields, setFields] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    setFields(initial || EMPTY_FORM)
  }, [initial])

  // Receipt suggestions drop straight into the fields, leaving the rest as-is.
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
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <div className="scan-buttons">
          {onScanReceipt && (
            <button
              type="button"
              className="receipt-upload-button"
              onClick={onScanReceipt}
              title="Choose a receipt photo and review its items"
            >
              <ReceiptIcon />
              Add from receipt
            </button>
          )}
        </div>
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

// Popup for adding a new pantry item, or editing an existing one. Reuses the
// same modal chrome as ReceiptConfirmModal (.modal-backdrop /
// .modal) so every overlay in the app looks and behaves the same way.
export default function AddItemModal({ editing, onSubmit, onClose, busy, prefill, scanStatus, onScanReceipt }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.querySelector('input')?.focus()
    return () => previous?.focus()
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
    if (event.key === 'Tab') {
      const controls = [...dialogRef.current.querySelectorAll('button, input, select, textarea, [tabindex="0"]')]
        .filter((element) => !element.disabled)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  const initial = useMemo(() => editing && {
    name: editing.name,
    location: editing.location,
    type: editing.type || 'Other',
    quantity: editing.quantity || '',
    purchasedAt: editing.purchasedAt,
    shelfLifeDays: editing.shelfLifeDays,
    notes: editing.notes || '',
  }, [editing])

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="modal add-item-modal"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? `Edit ${editing.name}` : 'Add an item'}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3 className="modal-title">{editing ? `Edit ${editing.name}` : 'Add an item'}</h3>
        {scanStatus && !editing && (
          <p className={scanStatus.tone === 'muted' ? 'muted small' : scanStatus.tone}>{scanStatus.text}</p>
        )}
        <ItemForm
          initial={initial}
          prefill={editing ? null : prefill}
          onScanReceipt={editing ? null : onScanReceipt}
          onSubmit={onSubmit}
          onCancel={onClose}
          busy={busy}
        />
      </div>
    </div>
  )
}
