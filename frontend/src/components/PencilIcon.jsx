import React from 'react'

// Standard pencil glyph, same 24x24 grid and stroke weight as the other icons.
export default function PencilIcon({ size = 16 }) {
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
      <path d="M12.5 6.5l5 5L8 21H3v-5z" />
      <path d="M15 4l5 5" />
    </svg>
  )
}
