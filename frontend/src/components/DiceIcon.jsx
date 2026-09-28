import React from 'react'

export default function DiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      {[[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" fill="currentColor" />
      ))}
    </svg>
  )
}
