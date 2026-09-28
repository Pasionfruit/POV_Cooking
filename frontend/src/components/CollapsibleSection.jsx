import React from 'react'
import ChevronIcon from './ChevronIcon'

// A section header (title + chevron toggle) with a body that unmounts while
// collapsed. Controlled by the caller so a page can force a section open
// (e.g. Pantry re-opens "Add an item" when you click Edit on a card even if
// you'd collapsed it). Doesn't render the outer .panel — callers keep that,
// same as every other panel in the app.
export default function CollapsibleSection({ title, label, open, onToggle, id, actions, children }) {
  // `title` can be a JSX node (e.g. title + icon); `label` gives the toggle
  // button a plain-text name for screen readers when it is. Defaults to
  // `title` itself, which works fine when title is already a plain string.
  const name = label || title
  return (
    <>
      <div className="collapsible-head">
        <h2>{title}</h2>
        <div className="collapsible-head-actions">
          {actions}
          <button
            type="button"
            className="collapse-toggle"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          >
            <ChevronIcon open={open} />
          </button>
        </div>
      </div>
      {open && <div id={id}>{children}</div>}
    </>
  )
}
