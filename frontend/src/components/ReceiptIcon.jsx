import React from 'react'

// Minimal receipt glyph — a torn-edge slip with a few line-item strokes —
// same 24x24 grid and stroke weight as the other icon buttons.
export default function ReceiptIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5z" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </svg>
  )
}
