import React from 'react'

// A cooking pot — pairs with the "Never cooked" filter.
export default function PotIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 10h20" />
      <path d="M5 10v4a7 7 0 0 0 7 7v0a7 7 0 0 0 7-7v-4" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </svg>
  )
}
