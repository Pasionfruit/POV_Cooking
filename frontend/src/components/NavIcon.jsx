import React from 'react'

// Minimal line icons for the navbar links, drawn on the same 24x24 grid and
// stroke weight as ThemeIcon so the whole bar reads as one set.
const PATHS = {
  saved: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
  'meal-plan': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  pantry: (
    <>
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 14h4" />
    </>
  ),
  'grocery-list': (
    <>
      <path d="M5 8h14l-1.4 10.1a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9z" />
      <path d="M8.5 8a3.5 3.5 0 0 1 7 0" />
    </>
  ),
  suggest: (
    <>
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M18 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
}

export default function NavIcon({ name, size = 20 }) {
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
      {PATHS[name]}
    </svg>
  )
}
