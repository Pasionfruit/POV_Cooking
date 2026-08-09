import React from 'react'

// Minimal barcode glyph, same 24x24 grid and stroke weight as the nav icons.
export default function BarcodeIcon({ size = 20 }) {
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
      <path d="M3 7V5.5A1.5 1.5 0 0 1 4.5 4H6M18 4h1.5A1.5 1.5 0 0 1 21 5.5V7M21 17v1.5a1.5 1.5 0 0 1-1.5 1.5H18M6 20H4.5A1.5 1.5 0 0 1 3 18.5V17" />
      <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
    </svg>
  )
}
