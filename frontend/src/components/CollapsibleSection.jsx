import React from 'react'
import ChevronIcon from './ChevronIcon'

// A section header (title + chevron toggle) with a body that unmounts while
// collapsed. Controlled by the caller so a page can force a section open
// (e.g. Pantry re-opens "Add an item" when you click Edit on a card even if
// you'd collapsed it). Doesn't render the outer .panel — callers keep that,
// same as every other panel in the app.
export default function CollapsibleSection({ title, open, onToggle, id, children }) {
  return (
    <>
      <div className="collapsible-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="collapse-toggle"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <ChevronIcon open={open} />
        </button>
      </div>
      {open && <div id={id}>{children}</div>}
    </>
  )
}
