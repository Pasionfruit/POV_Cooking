import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SpinWheel from './SpinWheel'
import { totalTimeText } from '../lib/recipeUtils'

// Wraps SpinWheel with the bits around the spin itself: which recipes are
// eligible, the result popup, and the exclusion set that keeps "Spin again"
// from handing back the recipe you just rejected.
export default function RecipeSpinner({ recipes, filteredRecipes, filtersActive }) {
  const [useFilters, setUseFilters] = useState(true)
  const [excludedIds, setExcludedIds] = useState(() => new Set())
  const [result, setResult] = useState(null)
  const [spinSignal, setSpinSignal] = useState(0)

  useEffect(() => {
    if (!result) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setResult(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [result])

  const source = useFilters ? filteredRecipes : recipes
  // Memoised so the reference only changes when the eligible set really does —
  // SpinWheel resamples its slices whenever this array identity changes, and
  // that must not happen just because a result popped up.
  const pool = useMemo(() => source.filter((r) => !excludedIds.has(r.id)), [source, excludedIds])
  // What "Spin again" would spin over, once the current result is ruled out.
  const nextPool = result ? pool.filter((r) => r.id !== result.id) : pool

  function reset() {
    setExcludedIds(new Set())
    setResult(null)
  }

  function spinAgain() {
    if (result) setExcludedIds((prev) => new Set(prev).add(result.id))
    setResult(null)
    setSpinSignal((s) => s + 1)
  }

  function resetAndSpin() {
    setExcludedIds(new Set())
    setResult(null)
    setSpinSignal((s) => s + 1)
  }

  const exhausted = excludedIds.size > 0 && pool.length < 2
  const time = result ? totalTimeText(result) : null

  return (
    <div className="panel wheel-panel">
      <div className="wheel-head">
        <h2>Randomize, we ball</h2>
        <div className="wheel-head-controls">
          <button
            type="button"
            className={`chip ${useFilters ? 'active' : ''}`}
            onClick={() => setUseFilters((v) => !v)}
            title="Spin only over the recipes matching the filters above"
          >
            {useFilters ? 'Using filters' : 'All recipes'}
          </button>
          {excludedIds.size > 0 && (
            <button type="button" className="chip" onClick={reset} title="Put every recipe back on the wheel">
              Reset ({excludedIds.size} out)
            </button>
          )}
        </div>
      </div>

      <p className="muted small">
        {pool.length} recipe{pool.length === 1 ? '' : 's'} on the wheel
        {useFilters && filtersActive ? ' from your current filters' : ''}
        {excludedIds.size > 0 ? ` · ${excludedIds.size} ruled out` : ''}
      </p>

      {exhausted ? (
        <p className="muted">
          You have ruled out everything on the wheel.{' '}
          <button type="button" className="link-button" onClick={reset}>
            Reset the wheel
          </button>
        </p>
      ) : pool.length < 2 ? (
        <p className="muted">
          {useFilters && filtersActive
            ? 'Not enough recipes match your filters to spin — loosen them or switch to all recipes.'
            : 'Add at least two recipes to use the wheel.'}
        </p>
      ) : (
        <SpinWheel recipes={pool} onResult={setResult} spinSignal={spinSignal} />
      )}

      {result && (
        <div className="modal-backdrop" onClick={() => setResult(null)} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spin-result-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setResult(null)} aria-label="Close">
              ×
            </button>
            <p className="modal-eyebrow">The wheel says</p>
            <h3 className="modal-title" id="spin-result-title">
              {result.title}
            </h3>
            <div className="card-meta modal-meta">
              {result.mealType && <span>{result.mealType}</span>}
              {time && <span>{time}</span>}
              {result.cuisine && <span>{result.cuisine}</span>}
            </div>
            <div className="modal-actions">
              <Link className="button primary" to={`/recipes/${result.id}`}>
                View recipe
              </Link>
              {nextPool.length >= 2 ? (
                <button type="button" onClick={spinAgain}>
                  Spin again
                </button>
              ) : (
                <button type="button" onClick={resetAndSpin} title="Put every recipe back on the wheel and spin">
                  Reset &amp; spin
                </button>
              )}
            </div>
            <p className="muted small modal-note">
              {nextPool.length >= 2
                ? `Spinning again drops this one — ${nextPool.length} left after that.`
                : 'That was the last one on the wheel.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
