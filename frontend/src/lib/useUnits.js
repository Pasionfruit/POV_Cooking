import { useCallback, useEffect, useState } from 'react'
import { UNIT_SYSTEMS } from './units'

// Which measuring system the reader wants: 'us' (cups, oz, °F) or 'metric' (ml, g, °C). Kept on this device
// and shared between pages, so the meal plan's grocery list follows the choice made on a recipe.
const KEY = 'pov_units'
const EVENT = 'pov-units-change'

export function readUnits() {
  try {
    const value = localStorage.getItem(KEY)
    return UNIT_SYSTEMS.includes(value) ? value : 'us'
  } catch {
    return 'us'
  }
}

export function useUnits() {
  const [units, setUnitsState] = useState(readUnits)

  useEffect(() => {
    const sync = () => setUnitsState(readUnits())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setUnits = useCallback((next) => {
    if (!UNIT_SYSTEMS.includes(next)) return
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // storage blocked: the choice lasts until the page is closed
    }
    setUnitsState(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [units, setUnits]
}
