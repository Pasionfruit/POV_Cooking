// API client. Defaults to the same host the page was loaded from (port 5001),
// so the app works on desktop (localhost) and phones on your LAN without config.
const BASE =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5001`

// Called when an authenticated request comes back 401 (stale/invalid session),
// so the app can log out instead of showing broken pages. Set by AuthContext.
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized()
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

// auth
export const register = (payload) => request('/auth/register', { method: 'POST', body: payload })
export const login = (payload) => request('/auth/login', { method: 'POST', body: payload })
export const googleLogin = (credential) => request('/auth/google', { method: 'POST', body: { credential } })
export const me = (token) => request('/auth/me', { token })

// recipes
export const getRecipes = () => request('/recipes')
export const getRecipe = (id) => request(`/recipes/${id}`)
export const createRecipe = (token, recipe) => request('/recipes', { method: 'POST', token, body: recipe })
export const updateRecipe = (token, id, recipe) => request(`/recipes/${id}`, { method: 'PUT', token, body: recipe })
export const deleteRecipe = (token, id) => request(`/recipes/${id}`, { method: 'DELETE', token })
export const importRecipes = (token, payload) => request('/recipes/import', { method: 'POST', token, body: payload })

// tried ("have cooked this") recipes
export const getTried = (token) => request('/tried', { token })
export const markTried = (token, recipeId) => request(`/tried/${recipeId}`, { method: 'POST', token })
export const unmarkTried = (token, recipeId) => request(`/tried/${recipeId}`, { method: 'DELETE', token })

// featured ("latest attempt") recipe
export const getFeatured = () => request('/featured')
export const setFeatured = (token, recipeId) => request('/featured', { method: 'PUT', token, body: { recipeId } })

// meal plan (weekStart = Monday as YYYY-MM-DD)
export const getMealPlan = (token, weekStart) => request(`/meal-plan?weekStart=${weekStart}`, { token })
export const saveMealPlan = (token, payload) => request('/meal-plan', { method: 'PUT', token, body: payload })

// saved
export const getSaved = (token) => request('/saved', { token })
export const saveRecipe = (token, recipeId) => request(`/saved/${recipeId}`, { method: 'POST', token })
export const unsaveRecipe = (token, recipeId) => request(`/saved/${recipeId}`, { method: 'DELETE', token })
