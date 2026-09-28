import React, { useEffect, useRef, useState } from 'react'
import CollapsibleSection from './CollapsibleSection'
import ComponentRandomizer from './ComponentRandomizer'
import RecipeSpinner from './RecipeSpinner'

export default function MealIdeasModal({ recipes, filteredRecipes, filtersActive, onClose }) {
  const [buildOpen, setBuildOpen] = useState(true)
  const dialogRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [])

  function handleKeyDown(event) {
    // The wheel result has its own dialog and Escape handler.
    if (event.target.closest('[role="dialog"]') !== dialogRef.current) return
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
    if (event.key === 'Tab') {
      const controls = [...dialogRef.current.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
        .filter((element) => !element.disabled && element.getClientRects().length)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="modal meal-ideas-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-ideas-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close meal ideas">×</button>
        <h2 id="meal-ideas-title" className="modal-title">Meal ideas</h2>
        <RecipeSpinner recipes={recipes} filteredRecipes={filteredRecipes} filtersActive={filtersActive} initiallyOpen />
        <div className="panel">
          <CollapsibleSection title="Build a meal" open={buildOpen} onToggle={() => setBuildOpen((open) => !open)} id="build-a-meal-body">
            <p className="muted small">Roll a combination of components when you want to improvise.</p>
            <ComponentRandomizer />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}
