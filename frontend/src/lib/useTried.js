import { useCallback, useEffect, useState } from 'react'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

// Which recipes this user has cooked. Powers the tried toggle and the
// "never cooked" filter.
export function useTried() {
  const { token, user } = useAuth()
  const [triedIds, setTriedIds] = useState(() => new Set())

  const refresh = useCallback(() => {
    if (!token) {
      setTriedIds(new Set())
      return Promise.resolve()
    }
    return api
      .getTried(token)
      .then(({ recipeIds }) => setTriedIds(new Set(recipeIds)))
      .catch(() => setTriedIds(new Set()))
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function toggleTried(recipe) {
    if (!user) return
    const next = new Set(triedIds)
    if (next.has(recipe.id)) {
      next.delete(recipe.id)
      setTriedIds(next)
      await api.unmarkTried(token, recipe.id).catch(refresh)
    } else {
      next.add(recipe.id)
      setTriedIds(next)
      await api.markTried(token, recipe.id).catch(refresh)
    }
  }

  return { triedIds, toggleTried, refresh }
}
