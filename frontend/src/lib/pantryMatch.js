import { ingredientToText } from './recipeUtils'

// Assumed to always be on hand, so they never count as "missing".
export const STAPLES = ['water', 'salt', 'pepper']

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// "Tomatoes" should match an ingredient line saying "1 tomato", and vice versa,
// so compare against a few simple singular/plural variants.
function variantsOf(name) {
  const base = normalize(name)
  const variants = new Set([base])
  if (base.endsWith('es')) variants.add(base.slice(0, -2))
  if (base.endsWith('s')) variants.add(base.slice(0, -1))
  variants.add(`${base}s`)
  return [...variants].filter((v) => v.length >= 3)
}

export function daysUntilExpiry(item, today = new Date()) {
  const purchased = new Date(`${item.purchasedAt}T00:00:00`)
  const expires = new Date(purchased)
  expires.setDate(expires.getDate() + (item.shelfLifeDays || 0))
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  return Math.round((expires - start) / 86400000)
}

export function expiryStatus(days) {
  if (days < 0) return 'expired'
  if (days <= 2) return 'warning'
  if (days <= 5) return 'soon'
  return 'fresh'
}

export function expiryLabel(days) {
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'Use today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

// Matches recipes against what's on hand. Expired items don't count as available.
export function matchRecipes(recipes, pantryItems, today = new Date()) {
  const available = pantryItems
    .filter((item) => daysUntilExpiry(item, today) >= 0)
    .flatMap((item) => variantsOf(item.name))
  const haveTerms = [...new Set([...available, ...STAPLES])]

  return recipes
    .map((recipe) => {
      const ingredients = (recipe.ingredients || []).map(ingredientToText).filter(Boolean)
      const missing = ingredients.filter((line) => {
        const text = normalize(line)
        return !haveTerms.some((term) => text.includes(term))
      })
      return {
        recipe,
        total: ingredients.length,
        have: ingredients.length - missing.length,
        missing,
      }
    })
    .filter((match) => match.total > 0)
    .sort((a, b) => a.missing.length - b.missing.length || b.have - a.have)
}
