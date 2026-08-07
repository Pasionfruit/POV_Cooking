import { useCallback, useEffect, useState } from 'react'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

// Shared hook for the user's saved-recipe ids + toggling, used by Home,
// Saved, and RecipeDetail so the heart state stays consistent.
export function useSaved() {
  const { token, user } = useAuth()
  const [savedRecipes, setSavedRecipes] = useState([])

  const refresh = useCallback(() => {
    if (!token) {
      setSavedRecipes([])
      return Promise.resolve()
    }
    return api
      .getSaved(token)
      .then(({ recipes }) => setSavedRecipes(recipes))
      .catch(() => setSavedRecipes([]))
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  const savedIds = new Set(savedRecipes.map((r) => r.id))

  async function toggleSave(recipe) {
    if (!user) return
    if (savedIds.has(recipe.id)) {
      setSavedRecipes((list) => list.filter((r) => r.id !== recipe.id))
      await api.unsaveRecipe(token, recipe.id).catch(refresh)
    } else {
      setSavedRecipes((list) => [...list, recipe])
      await api.saveRecipe(token, recipe.id).catch(refresh)
    }
  }

  return { savedRecipes, savedIds, toggleSave, refresh }
}
