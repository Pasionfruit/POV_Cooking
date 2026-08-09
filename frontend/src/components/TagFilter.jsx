import React, { useEffect, useRef, useState } from 'react'

// Multiselect dropdown over the tag vocabulary. A recipe has to carry every
// checked tag to pass the filter, so each pick narrows the list.
export default function TagFilter({ tags, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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

  if (tags.length === 0) return null

  function toggle(tag) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])
  }

  const label = selected.length === 0 ? 'All tags' : selected.length === 1 ? selected[0] : `${selected.length} tags`

  return (
    <div className="tag-filter" ref={ref}>
      <button
        type="button"
        className={`tag-filter-toggle ${selected.length ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Filter by tag"
      >
        <span className="tag-filter-label">{label}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="tag-filter-menu" role="group" aria-label="Tags">
          <div className="tag-filter-list">
            {tags.map((tag) => (
              <label key={tag} className="tag-filter-option">
                <input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)} />
                <span>{tag}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button type="button" className="link-button tag-filter-clear" onClick={() => onChange([])}>
              Clear tags
            </button>
          )}
        </div>
      )}
    </div>
  )
}
