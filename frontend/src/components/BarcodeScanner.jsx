import React, { useEffect, useRef, useState } from 'react'

// Camera barcode scanner. Uses the browser's native BarcodeDetector where it
// exists (Chrome, Android) and lazy-loads ZXing everywhere else (Safari, iOS)
// so the decoder only ships to people who actually open the scanner.
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const stopRef = useRef(null)
  const [status, setStatus] = useState('starting')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const cleanups = []

    function stopEverything() {
      cleanups.forEach((fn) => {
        try {
          fn()
        } catch {
          /* teardown is best effort */
        }
      })
      cleanups.length = 0
    }
    stopRef.current = stopEverything

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext
            ? 'This browser cannot open the camera.'
            : 'The camera needs a secure connection — open the app over https:// or on localhost.'
        )
        setStatus('error')
        return
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (err) {
        if (cancelled) return
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow it in your browser settings and try again.'
            : `Could not start the camera: ${err.message}`
        )
        setStatus('error')
        return
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      cleanups.push(() => stream.getTracks().forEach((t) => t.stop()))

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play().catch(() => {})
      if (cancelled) return
      setStatus('scanning')

      const handle = (value) => {
        const code = String(value || '').replace(/\D/g, '')
        if (!code || cancelled) return
        cancelled = true
        stopEverything()
        onDetected(code)
      }

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'itf'],
        })
        const timer = setInterval(async () => {
          if (cancelled || video.readyState < 2) return
          try {
            const [first] = await detector.detect(video)
            if (first) handle(first.rawValue)
          } catch {
            /* a failed frame is normal — keep going */
          }
        }, 250)
        cleanups.push(() => clearInterval(timer))
        return
      }

      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) handle(result.getText())
        })
        cleanups.push(() => controls.stop())
      } catch (err) {
        if (cancelled) return
        setError(`Could not start the barcode reader: ${err.message}`)
        setStatus('error')
      }
    }

    start()
    return () => {
      cancelled = true
      stopEverything()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function close() {
    stopRef.current?.()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={close} role="presentation">
      <div
        className="modal scanner-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Scan a barcode"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={close} aria-label="Close scanner">
          ×
        </button>
        <p className="modal-eyebrow">Scan a barcode</p>
        {error ? (
          <p className="error scanner-error">{error}</p>
        ) : (
          <>
            <div className="scanner-frame">
              <video ref={videoRef} className="scanner-video" muted playsInline />
              <span className="scanner-reticle" aria-hidden />
            </div>
            <p className="muted small modal-note">
              {status === 'starting' ? 'Starting the camera…' : 'Hold the barcode inside the frame.'}
            </p>
          </>
        )}
        <div className="modal-actions">
          <button type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
