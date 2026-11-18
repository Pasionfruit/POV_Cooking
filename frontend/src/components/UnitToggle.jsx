import React from 'react'

// US | Metric switch for the amounts, temperatures and sizes on a recipe.
export default function UnitToggle({ units, onChange }) {
  return (
    <div className="unit-toggle" role="group" aria-label="Measuring system">
      <button
        type="button"
        className={units === 'us' ? 'active' : ''}
        aria-pressed={units === 'us'}
        onClick={() => onChange('us')}
        title="Cups, ounces, pounds and °F"
      >
        US
      </button>
      <button
        type="button"
        className={units === 'metric' ? 'active' : ''}
        aria-pressed={units === 'metric'}
        onClick={() => onChange('metric')}
        title="Millilitres, grams and °C"
      >
        Metric
      </button>
    </div>
  )
}
