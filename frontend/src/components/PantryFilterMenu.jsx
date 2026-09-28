import React, { useEffect, useRef, useState } from 'react'
import FilterIcon from './FilterIcon'

// Bundles the location/type/duration selects behind a single filter icon,
// same click-outside-to-close popover pattern as TagFilter.
export default function PantryFilterMenu({
  locations,
  types,
  durations,
  location,
  type,
  duration,
  onLocationChange,
  onTypeChange,
  onDurationChange,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const active = Boolean(location || type || duration)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="pantry-filter" ref={ref}>
      <button
        type="button"
        className={`pantry-filter-toggle ${active ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Filter pantry items"
        title="Filter"
      >
        <FilterIcon />
      </button>
      {open && (
        <div className="pantry-filter-menu" role="group" aria-label="Filters">
          <select value={location} onChange={(e) => onLocationChange(e.target.value)} aria-label="Filter by location">
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => onTypeChange(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={duration} onChange={(e) => onDurationChange(e.target.value)} aria-label="Filter by duration left">
            {durations.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {active && (
            <button
              type="button"
              className="link-button pantry-filter-clear"
              onClick={() => {
                onLocationChange('')
                onTypeChange('')
                onDurationChange('')
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
