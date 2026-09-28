import React from 'react'

// Generic yes/no popup, same modal chrome as the rest of the app
// (AddItemModal / ReceiptConfirmModal / BarcodeScanner). Pass `selected` +
// `onToggleItem` to let the user uncheck individual items before confirming
// (e.g. grocery "Clear all"); omit them for a plain confirm/cancel dialog.
export default function ConfirmModal({
  title,
  items,
  message,
  confirmLabel = 'Confirm',
  busy = false,
  onConfirm,
  onCancel,
  selected,
  onToggleItem,
}) {
  const selectable = !!selected
  const noneSelected = selectable && selected.every((s) => !s)
  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Close" disabled={busy}>
          ×
        </button>
        <h3 className="modal-title" id="confirm-modal-title">
          {title}
        </h3>
        {items && items.length > 0 && (
          <ul className={`confirm-modal-list ${selectable ? 'confirm-modal-list-selectable' : ''}`}>
            {items.map((name, i) =>
              selectable ? (
                <li key={i}>
                  <label className="confirm-modal-item">
                    <input type="checkbox" checked={selected[i]} onChange={() => onToggleItem(i)} disabled={busy} />
                    <span>{name}</span>
                  </label>
                </li>
              ) : (
                <li key={i}>{name}</li>
              )
            )}
          </ul>
        )}
        {message && <p className="muted">{message}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="danger primary" onClick={onConfirm} disabled={busy || noneSelected}>
            {busy ? 'Removing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
