import React from 'react'

// Standard funnel glyph, same 24x24 grid and stroke weight as the other icons.
export default function FilterIcon({ size = 18 }) {
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
      <path d="M4 5h16l-6 7.5V18l-4 2v-7.5z" />
    </svg>
  )
}
