import React from 'react'

// Generic yes/no popup, same modal chrome as the rest of the app
// (AddItemModal / ReceiptConfirmModal / BarcodeScanner).
export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', busy = false, onConfirm, onCancel }) {
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
        {message && <p className="muted">{message}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="danger primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Removing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
