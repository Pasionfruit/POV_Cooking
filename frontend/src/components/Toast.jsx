import React, { useEffect } from 'react'

// A small dismissable notice pinned to the bottom of the viewport. Closes
// itself after `duration` ms, or immediately if the user dismisses it first.
export default function Toast({ message, onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return undefined
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  )
}
