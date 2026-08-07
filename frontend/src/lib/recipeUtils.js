// Ingredients are semi-structured: plain strings ("2 cups flour") or objects
// ({ item, quantity, unit, note }). Render either form as text.
export function ingredientToText(ingredient) {
  if (typeof ingredient === 'string') return ingredient
  if (!ingredient || typeof ingredient !== 'object') return String(ingredient ?? '')
  const parts = [ingredient.quantity, ingredient.unit, ingredient.item || ingredient.name]
    .filter((p) => p !== undefined && p !== null && p !== '')
    .map(String)
  const text = parts.join(' ')
  return ingredient.note ? `${text} (${ingredient.note})` : text
}

export function totalTimeText(recipe) {
  const total = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)
  if (!total) return null
  return total >= 60 ? `${Math.floor(total / 60)} h ${total % 60 ? `${total % 60} min` : ''}`.trim() : `${total} min`
}

export function matchesQuery(recipe, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    ...(recipe.tags || []),
    ...(recipe.ingredients || []).map(ingredientToText),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}
