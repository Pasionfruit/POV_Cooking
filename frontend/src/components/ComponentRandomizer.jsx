import React, { useEffect, useRef, useState } from 'react'

// Build-a-meal randomizer: rolls one option per component category. Useful when
// you don't want an existing recipe, just an idea of what to cook.
const COMPONENTS = [
  {
    key: 'carbs',
    label: 'Carbs',
    options: ['Rice', 'Pasta', 'Potatoes', 'Bread', 'Quinoa', 'Egg noodles', 'Tortillas', 'Couscous', 'Sweet potato', 'Polenta'],
  },
  {
    key: 'protein',
    label: 'Protein',
    options: ['Chicken thigh', 'Ground beef', 'Pork belly', 'Tofu', 'Shrimp', 'Salmon', 'Eggs', 'Black beans', 'Chickpeas', 'Steak'],
  },
  {
    key: 'sauce',
    label: 'Sauce',
    options: ['Tomato', 'Garlic butter', 'Soy ginger', 'Peanut', 'Pesto', 'Coconut curry', 'Chimichurri', 'Teriyaki', 'Lemon herb', 'Gochujang'],
  },
  {
    key: 'vegetables',
    label: 'Vegetables',
    options: ['Broccoli', 'Spinach', 'Bell peppers', 'Carrots', 'Zucchini', 'Green beans', 'Mushrooms', 'Asparagus', 'Bok choy', 'Cabbage'],
  },
]

function randomOption(options, avoid) {
  const pool = options.length > 1 ? options.filter((o) => o !== avoid) : options
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function ComponentRandomizer() {
  const [picks, setPicks] = useState({})
  const [rolling, setRolling] = useState([])
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearInterval), [])

  // Start with a combination showing rather than empty placeholders.
  useEffect(() => {
    setPicks(Object.fromEntries(COMPONENTS.map((c) => [c.key, randomOption(c.options)])))
  }, [])

  // Flick through options for a moment before settling, so it reads as a roll.
  function roll(keys) {
    setRolling(keys)
    const targets = {}
    keys.forEach((key) => {
      const component = COMPONENTS.find((c) => c.key === key)
      targets[key] = randomOption(component.options, picks[key])
    })

    const interval = setInterval(() => {
      setPicks((prev) => {
        const next = { ...prev }
        keys.forEach((key) => {
          const component = COMPONENTS.find((c) => c.key === key)
          next[key] = randomOption(component.options, next[key])
        })
        return next
      })
    }, 80)
    timers.current.push(interval)

    setTimeout(() => {
      clearInterval(interval)
      setPicks((prev) => ({ ...prev, ...targets }))
      setRolling([])
    }, 700)
  }

  const hasPicks = COMPONENTS.every((c) => picks[c.key])

  return (
    <div className="randomizer">
      <div className="randomizer-grid">
        {COMPONENTS.map((component) => (
          <button
            key={component.key}
            type="button"
            className={`randomizer-cell ${rolling.includes(component.key) ? 'rolling' : ''}`}
            onClick={() => roll([component.key])}
            title={`Re-roll ${component.label.toLowerCase()}`}
          >
            <span className="randomizer-label">{component.label}</span>
            <span className="randomizer-value">{picks[component.key] || '—'}</span>
          </button>
        ))}
      </div>
      <div className="randomizer-actions">
        <button type="button" className="primary" onClick={() => roll(COMPONENTS.map((c) => c.key))}>
          {hasPicks ? 'Randomize again' : 'Randomize'}
        </button>
        <span className="muted small">Tap any tile to re-roll just that one.</span>
      </div>
    </div>
  )
}
