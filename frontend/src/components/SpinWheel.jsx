import React, { useMemo, useRef, useState } from 'react'

const COLORS = ['#e8927c', '#f2b705', '#7fb069', '#6ca6c1', '#b087b9', '#e0685e', '#8aa29e', '#d4a373']
const MAX_SLICES = 12

function polar(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [radius * Math.cos(rad), radius * Math.sin(rad)]
}

function slicePath(startAngle, endAngle, radius) {
  const [x1, y1] = polar(startAngle, radius)
  const [x2, y2] = polar(endAngle, radius)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

// Spinning wheel of recipes. Spins with CSS transition to a random winner and
// reports it via onResult. If there are more recipes than fit, a random sample
// goes on the wheel (reshuffled with the ↻ button).
export default function SpinWheel({ recipes, onResult }) {
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const winnerRef = useRef(null)

  const slices = useMemo(() => {
    if (recipes.length <= MAX_SLICES) return recipes
    const pool = [...recipes]
    const picked = []
    while (picked.length < MAX_SLICES && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    return picked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, shuffleSeed])

  if (slices.length < 2) {
    return <p className="muted">Add at least two recipes to use the wheel.</p>
  }

  const sliceAngle = 360 / slices.length

  function spin() {
    if (spinning) return
    const winnerIndex = Math.floor(Math.random() * slices.length)
    winnerRef.current = slices[winnerIndex]
    // Rotate so the winner's slice center lands under the top pointer,
    // plus a little jitter and 5 extra full turns for drama.
    const winnerCenter = winnerIndex * sliceAngle + sliceAngle / 2
    const desired = (360 - winnerCenter) % 360
    const current = ((rotation % 360) + 360) % 360
    const delta = (desired - current + 360) % 360
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.6
    setSpinning(true)
    setRotation(rotation + 5 * 360 + delta + jitter)
  }

  function handleSpinEnd() {
    if (!spinning) return
    setSpinning(false)
    if (winnerRef.current) onResult(winnerRef.current)
  }

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden>
        ▼
      </div>
      <svg
        className="wheel"
        viewBox="-105 -105 210 210"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 3.5s cubic-bezier(0.2, 0.85, 0.25, 1)' : 'none',
        }}
        onTransitionEnd={handleSpinEnd}
      >
        {slices.map((recipe, i) => {
          const start = i * sliceAngle
          const mid = start + sliceAngle / 2
          const [tx, ty] = polar(mid, 62)
          const label = recipe.title.length > 14 ? `${recipe.title.slice(0, 13)}…` : recipe.title
          return (
            <g key={recipe.id}>
              <path d={slicePath(start, start + sliceAngle, 100)} fill={COLORS[i % COLORS.length]} stroke="#00000022" />
              <text
                x={tx}
                y={ty}
                transform={`rotate(${mid + (mid > 90 && mid < 270 ? 180 : 0)} ${tx} ${ty})`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="wheel-label"
              >
                {label}
              </text>
            </g>
          )
        })}
        <circle r="14" fill="var(--surface)" stroke="#00000033" />
      </svg>
      <div className="wheel-buttons">
        <button type="button" className="primary" onClick={spin} disabled={spinning}>
          {spinning ? 'Spinning…' : 'Spin'}
        </button>
        {recipes.length > MAX_SLICES && (
          <button
            type="button"
            onClick={() => setShuffleSeed((s) => s + 1)}
            disabled={spinning}
            title="Shuffle which recipes are on the wheel"
          >
            ↻ Shuffle
          </button>
        )}
      </div>
    </div>
  )
}
