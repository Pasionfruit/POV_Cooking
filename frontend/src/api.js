const BASE = 'http://localhost:5000'

function authHeaders(token) {
  return token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
}

export async function register({ username, password, adminCode }) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, password, adminCode })
  })
  return res.json()
}

export async function login({ username, password }) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, password })
  })
  return res.json()
}

export async function getRecipes(token) {
  const res = await fetch(`${BASE}/recipes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}

export async function createRecipe(token, payload) {
  const res = await fetch(`${BASE}/recipes`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body: JSON.stringify(payload)
  })
  return res.json()
}

export async function updateRecipe(token, id, payload) {
  const res = await fetch(`${BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(token) },
    body: JSON.stringify(payload)
  })
  return res.json()
}

export async function deleteRecipe(token, id) {
  const res = await fetch(`${BASE}/recipes/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token) }
  })
  return res.json()
}

export async function saveRecipe(token, recipeId) {
  const res = await fetch(`${BASE}/saved`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body: JSON.stringify({ recipe_id: recipeId })
  })
  return res.json()
}

export async function getSaved(token) {
  const res = await fetch(`${BASE}/saved`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}
