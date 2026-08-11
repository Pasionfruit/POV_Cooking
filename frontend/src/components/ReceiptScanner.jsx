import React, { useEffect, useRef, useState } from 'react'

// Captures one receipt photo — camera on mobile via the `capture` attribute,
// a normal file picker on desktop — and OCRs it in-browser with Tesseract.js,
// lazy-loaded so its ~2MB decoder only ships to people who use this feature
// (same trick as BarcodeScanner's ZXing fallback). Hands the raw text up to
// the caller via onText; parsing that text into pantry items is the server's
// job (POST /pantry/receipt/parse), same split as the barcode scanner only
// ever reporting a raw code and letting the page do the lookup.
export default function ReceiptScanner({ onText, onClose }) {
  const inputRef = useRef(null)
  const cancelledRef = useRef(false)
  const [status, setStatus] = useState('picking') // picking | reading | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    inputRef.current?.click()
    return () => {
      cancelledRef.current = true
    }
  }, [])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be re-picked later
    if (!file) {
      onClose()
      return
    }
    setStatus('reading')
    setProgress(0)
    setError(null)
    try {
      const { default: Tesseract } = await import('tesseract.js')
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (cancelledRef.current) return
          if (m.status === 'recognizing text' && typeof m.progress === 'number') setProgress(m.progress)
        },
      })
      if (cancelledRef.current) return
      const text = data?.text || ''
      if (!text.trim()) throw new Error('Could not read any text from that photo — try a clearer, well-lit shot.')
      onText(text)
    } catch (err) {
      if (cancelledRef.current) return
      setError(err.message)
      setStatus('error')
    }
  }

  function pickAgain() {
    setStatus('picking')
    setError(null)
    inputRef.current?.click()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Scan a receipt"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="modal-eyebrow">Scan a receipt</p>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
        {status === 'error' ? (
          <p className="error">{error}</p>
        ) : status === 'reading' ? (
          <>
            <div className="receipt-progress">
              <div className="receipt-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="muted small modal-note">Reading your receipt… {Math.round(progress * 100)}%</p>
          </>
        ) : (
          <p className="muted small modal-note">Choose or take a photo of your receipt…</p>
        )}
        <div className="modal-actions">
          {status === 'error' && (
            <button type="button" className="primary" onClick={pickAgain}>
              Try another photo
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
