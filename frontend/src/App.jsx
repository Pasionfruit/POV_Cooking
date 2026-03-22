import React, { useEffect, useMemo, useState } from 'react'
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, login, register, getSaved, saveRecipe, unsaveRecipe, getPantry, addPantry, updatePantry, deletePantry } from './api.js'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import MealPlan from './pages/MealPlan'
import Settings from './pages/Settings'

// Minimal util to parse JWT payload
function parseJwt (token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token, setToken] = useState(localStorage.getItem('pov_token') || null)
  const [user, setUser] = useState(() => {
    const savedUsername = localStorage.getItem('pov_username')
    return savedUsername ? { username: savedUsername } : null
  })
  const [recipes, setRecipes] = useState([])
  const [saved, setSaved] = useState([])
  const [pantry, setPantry] = useState([])
  const [pantryDraft, setPantryDraft] = useState({ name: '', category: 'Grains', expiration_date: '', quantity: 1, unit: 'pcs', unit_system: 'metric', location: 'Pantry', notes: '' })
  const [pantryFilter, setPantryFilter] = useState({ category: 'All', location: 'All', status: 'All', search: '' })
  const [pantryPreview, setPantryPreview] = useState(null)
  const [recipePreview, setRecipePreview] = useState(null)
  const [toasts, setToasts] = useState([])
  const [loading, setLoading] = useState(false)

  function pushToast(message) {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2200)
  }

  useEffect(() => {
    const t = token
    if (t) {
      const payload = parseJwt(t)
      // We can't reliably fetch user name from token; we'll keep role in payload if present
      if (payload) {
        setUser(prev => ({ username: prev?.username, role: payload.role || 'user', id: payload.sub }))
      }
      fetchRecipes(t)
      fetchSaved(t)
    } else {
      setUser(null)
      setRecipes([])
      setSaved([])
    }
    // eslint-disable-next-line
  }, [token])

  // Pantry loading on mount when token exists
  useEffect(() => {
    if (token) {
      getPantry(token).then(setPantry).catch(() => {})
    }
  }, [token])

  function fetchRecipes(t) {
    setLoading(true)
    getRecipes(t).then((data) => {
      setRecipes(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  function fetchSaved(t) {
    if (!t) return
    getSaved(t).then((data) => setSaved(data)).catch(() => {})
  }

  async function handleLogin(creds) {
    const r = await login(creds)
    if (r.token) {
      setToken(r.token)
      localStorage.setItem('pov_token', r.token)
      localStorage.setItem('pov_username', creds.username)
      const payload = parseJwt(r.token)
      setUser({ username: creds.username, id: payload?.sub, role: payload?.role || 'user' })
      navigate('/explore')
    } else {
      alert('Login failed: ' + (r.error || 'unknown'))
    }
  }

  async function handleRegister(data) {
    const r = await register(data)
    if (r.id) {
      // auto login after register
      const loginRes = await login({ username: data.username, password: data.password })
      if (loginRes.token) {
        setToken(loginRes.token)
        localStorage.setItem('pov_token', loginRes.token)
        localStorage.setItem('pov_username', data.username)
        const payload = parseJwt(loginRes.token)
        setUser({ username: data.username, id: payload?.sub, role: payload?.role || 'user' })
        navigate('/explore')
      }
    } else {
      alert('Registration failed: ' + (r.error || 'unknown'))
    }
  }

  const isAuthenticated = Boolean(token)
  const isAdmin = user?.role === 'admin'

  // Logout handler
  function logout() {
    setToken(null)
    localStorage.removeItem('pov_token')
    localStorage.removeItem('pov_username')
    setUser(null)
    navigate('/login')
  }

  // Simple forms state for recipe creation/editing (shared by admin/explorer)
  const [draft, setDraft] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })

  // Create recipe handler (used by both admin and explorer, as appropriate on server)
  async function handleCreate() {
    if (!token) return
    const payload = {
      title: draft.title,
      ingredients: draft.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      instructions: draft.instructions,
      time: parseInt(draft.time) || 0,
      duration: parseInt(draft.duration) || 0,
      equipment: draft.equipment.split(',').map(s => s.trim()).filter(Boolean),
      visibility: draft.visibility
    }
    const res = await createRecipe(token, payload)
    if (res?.id) {
      fetchRecipes(token)
      setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    } else {
      alert('Create failed')
    }
  }

  async function handleUpdate(id, payload) {
    if (!token) return
    const res = await updateRecipe(token, id, payload)
    if (res?.id) {
      fetchRecipes(token)
    } else {
      alert('Update failed')
    }
  }

  async function handleDelete(id) {
    if (!token) return
    const res = await deleteRecipe(token, id)
    if (res?.ok) {
      fetchRecipes(token)
    } else {
      alert('Delete failed')
    }
  }

  async function handleSave(recipeId) {
    if (!token) return
    const res = await saveRecipe(token, recipeId)
    if (res?.ok) {
      fetchSaved(token)
      pushToast('Recipe saved')
    } else {
      alert('Save failed')
    }
  }

  async function handleUnsave(recipeId) {
    if (!token) return
    const res = await unsaveRecipe(token, recipeId)
    if (res?.ok) {
      fetchSaved(token)
      pushToast('Recipe unsaved')
    } else {
      alert('Unsave failed')
    }
  }

  const savedIds = useMemo(() => new Set(saved.map(r => r.id)), [saved])

  // Pantry actions
  // Pantry link in header will navigate to /pantry (pantryView renders when path matches)
  async function pantryAdd() {
    if (!token) { alert('Please login'); return }
    const payload = {
      name: pantryDraft.name,
      category: pantryDraft.category,
      expiration_date: pantryDraft.expiration_date || null,
      quantity: pantryDraft.quantity ? Number(pantryDraft.quantity) : 1,
      unit: pantryDraft.unit,
      unit_system: pantryDraft.unit_system,
      location: pantryDraft.location,
      notes: pantryDraft.notes
    }
    const res = await addPantry(token, payload)
    if (res?.id) {
      const fresh = await getPantry(token)
      setPantry(fresh)
      setPantryDraft({ name: '', category: 'Grains', expiration_date: '', quantity: 1, unit: 'pcs', unit_system: 'metric', location: 'Pantry', notes: '' })
    } else {
      alert('Failed to add pantry item')
    }
  }

  async function pantryDelete(id) {
    if (!token) return
    const res = await deletePantry(token, id)
    if (res?.ok) {
      const fresh = await getPantry(token)
      setPantry(fresh)
    }
  }

function ViewPantryCard({ p }) {
    const days = p.expiration_date ? Math.ceil((new Date(p.expiration_date) - new Date()) / (1000*60*60*24)) : null
    const color = days == null ? '' : (days < 0 ? 'expired' : days <=7 ? 'danger' : days <=14 ? 'warn' : 'safe')
    return (
      <div className="pantry-card" key={p.id}>
        <div className="pantry-name">{p.name} <span className={`badge cat-${p.category.replace(/\s+/g, '_')}`}>{p.category}</span></div>
        <div className="pantry-row">Quantity: {p.quantity} {p.unit} • Location: {p.location}</div>
        <div className="pantry-row">{p.expiration_date ? `Expires: ${p.expiration_date}` : 'No expiration'}</div>
        {p.expiration_date && (
          <div className={`pantry-row expiry ${color}`}>Expiring in {days < 0 ? 'expired' : days + ' days'}</div>
        )}
        <div className="pantry-actions">
          <button onClick={() => setPantryPreview(p)}>Preview</button>
          <button onClick={() => pantryDelete(p.id)}>Delete</button>
        </div>
      </div>
    )
  }
  // Preview modal for a pantry item
  function PantryPreviewModal({ item, onClose }) {
    if (!item) return null
    const daysLeft = item.expiration_date ? Math.ceil((new Date(item.expiration_date) - new Date()) / (1000*60*60*24)) : null
    const color = daysLeft == null ? '' : (daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'danger' : daysLeft <= 14 ? 'warn' : 'safe')
    return (
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-label="Pantry item preview">
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <strong>{item.name}</strong>
            <button onClick={onClose}>Close</button>
          </div>
          <div className="modal-body">
            <div>Category: <span className={`badge cat-${item.category.replace(/\s+/g, '_')}`}>{item.category}</span></div>
            <div>Quantity: {item.quantity} {item.unit} ({item.unit_system})</div>
            <div>Location: {item.location}</div>
            <div>Expiration: {item.expiration_date ?? 'N/A'} {item.expiration_date ? `(${daysLeft} days left)` : ''}</div>
            {item.notes && <div>Notes: {item.notes}</div>}
          </div>
        </div>
      </div>
    )
  }
  const pantryView = (
    <div className="pantry-panel panel">
      <h2>Pantry</h2>
      <section className="panel" aria-label="Add Pantry Item">
        <div className="pantry-form">
          <input placeholder="Name" value={pantryDraft.name} onChange={e => setPantryDraft({ ...pantryDraft, name: e.target.value })} />
          <select value={pantryDraft.category} onChange={e => setPantryDraft({ ...pantryDraft, category: e.target.value })}>
            {['Grains','Vegetables','Fruits','Dairy','Protein','Fats and Oils','Sugars and Sweets'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={pantryDraft.expiration_date} onChange={e => setPantryDraft({ ...pantryDraft, expiration_date: e.target.value })} />
          <input type="number" min="0" value={pantryDraft.quantity} onChange={e => setPantryDraft({ ...pantryDraft, quantity: e.target.value })} />
          <select value={pantryDraft.unit} onChange={e => setPantryDraft({ ...pantryDraft, unit: e.target.value })}>
            <option value="pcs">pcs</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="L">L</option>
            <option value="oz">oz</option>
            <option value="lb">lb</option>
          </select>
          <select value={pantryDraft.unit_system} onChange={e => setPantryDraft({ ...pantryDraft, unit_system: e.target.value })}>
            <option value="metric">metric</option>
            <option value="imperial">imperial</option>
          </select>
          <select value={pantryDraft.location} onChange={e => setPantryDraft({ ...pantryDraft, location: e.target.value })}>
            <option value="Fridge">Fridge</option>
            <option value="Freezer">Freezer</option>
            <option value="Pantry">Pantry</option>
            <option value="Misc">Misc</option>
          </select>
          <input placeholder="Notes" value={pantryDraft.notes} onChange={e => setPantryDraft({ ...pantryDraft, notes: e.target.value })} />
          <button onClick={pantryAdd}>Add Pantry Item</button>
        </div>
      </section>
      <section className="panel" aria-label="Pantry Items">
        <div className="pantry-filter" style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:8}}>
          <select value={pantryFilter.category} onChange={e => setPantryFilter({ ...pantryFilter, category: e.target.value })}>
            <option value="All">All Categories</option>
            {['Grains','Vegetables','Fruits','Dairy','Protein','Fats and Oils','Sugars and Sweets'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={pantryFilter.location} onChange={e => setPantryFilter({ ...pantryFilter, location: e.target.value })}>
            <option value="All">All Locations</option>
            {['Fridge','Freezer','Pantry','Misc'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={pantryFilter.status} onChange={e => setPantryFilter({ ...pantryFilter, status: e.target.value })}>
            <option value="All">All Status</option>
            <option value="Expired">Expired</option>
            <option value="ExpiringSoon">Expiring Soon</option>
            <option value="NotExpiring">Not Expiring</option>
          </select>
          <input placeholder="Search" value={pantryFilter.search} onChange={e => setPantryFilter({ ...pantryFilter, search: e.target.value })} />
        </div>
        <div className="pantry-list">
          {pantry.filter(p => {
            if (pantryFilter.category !== 'All' && p.category !== pantryFilter.category) return false
            if (pantryFilter.location !== 'All' && p.location !== pantryFilter.location) return false
            if (pantryFilter.search && !p.name.toLowerCase().includes(pantryFilter.search.toLowerCase())) return false
            const daysLeft = p.expiration_date ? Math.ceil((new Date(p.expiration_date) - new Date()) / (1000*60*60*24)) : null
            if (pantryFilter.status === 'Expired') { if (!p.expiration_date) return false; if (daysLeft >= 0) return false }
            else if (pantryFilter.status === 'ExpiringSoon') { if (!p.expiration_date) return false; if (!(daysLeft <= 7 && daysLeft >= 0)) return false }
            else if (pantryFilter.status === 'NotExpiring') { if (p.expiration_date && daysLeft <= 7) return false }
            return true
          }).map(p => (
            <ViewPantryCard p={p} key={p.id} />
          ))}
        </div>
      </section>
    </div>
  )

  const loginView = (
    <div className="auth-page">
      <h2>POV Cooking - Login</h2>
      <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  )

  const adminView = (
    <AdminDashboard
      recipes={recipes}
      draft={draft}
      setDraft={setDraft}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      isAdmin={isAdmin}
    />
  )

  const explorerView = (
    <ExplorerDashboard
      recipes={recipes}
      savedIds={savedIds}
      onSave={handleSave}
      onUnsave={handleUnsave}
      onPreview={setRecipePreview}
    />
  )

  const recipesView = (
    <RecipesDashboard
      saved={saved}
      draft={draft}
      setDraft={setDraft}
      onCreate={handleCreate}
      onUnsave={handleUnsave}
      onPreview={setRecipePreview}
    />
  )

  const mealPlanView = <MealPlan />
  const settingsView = <Settings />

  // Root layout with header
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">{user?.username || 'POV'} Cooking</div>
        <nav className="nav">
          <Link to="/explore" className="nav-link">Explorer</Link>
          {isAuthenticated && <Link to="/recipes" className="nav-link">Recipes</Link>}
          {isAuthenticated && <Link to="/pantry" className="nav-link">Pantry</Link>}
          {isAuthenticated && <Link to="/meal-plan" className="nav-link">Meal Prep</Link>}
          {isAuthenticated && <Link to="/settings" className="nav-link">Settings</Link>}
          {isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
          {!isAuthenticated ? (
            <Link to="/login" className="nav-link">Login</Link>
          ) : (
            <>
              <button className="nav-link" onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </header>
      <main className="content">
        {!isAuthenticated
          ? loginView
          : location.pathname.startsWith('/pantry')
            ? pantryView
            : location.pathname.startsWith('/recipes')
              ? recipesView
            : location.pathname.startsWith('/meal-plan')
              ? mealPlanView
              : location.pathname.startsWith('/settings')
                ? settingsView
                : location.pathname.startsWith('/admin')
                  ? (isAdmin ? adminView : explorerView)
                  : (isAdmin ? adminView : explorerView)}
        {pantryPreview && <PantryPreviewModal item={pantryPreview} onClose={() => setPantryPreview(null)} />}
        {recipePreview && <RecipePreviewModal item={recipePreview} onClose={() => setRecipePreview(null)} />}
      </main>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map(t => <div key={t.id} className="toast">{t.message}</div>)}
      </div>
    </div>
  )
}

function LoginForm({ onLogin, onRegister }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [adminCode, setAdminCode] = useState('')
  return (
    <div className="login-form">
      <div>
        <input placeholder="Username" value={u} onChange={e => setU(e.target.value)} />
      </div>
      <div>
        <input placeholder="Password" type="password" value={p} onChange={e => setP(e.target.value)} />
      </div>
      <div>
        <input placeholder="Admin Code (optional)" value={adminCode} onChange={e => setAdminCode(e.target.value)} />
      </div>
      <div className="row">
        <button onClick={() => onLogin({ username: u, password: p })}>Login</button>
        <button onClick={() => onRegister({ username: u, password: p, adminCode })}>Register</button>
      </div>
    </div>
  )
}

function AdminDashboard({ recipes, draft, setDraft, onCreate, onUpdate, onDelete, isAdmin }) {
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const startEdit = (r) => {
    setEditing(r.id)
    setDraft({ title: r.title, ingredients: (r.ingredients || []).join(', '), instructions: r.instructions, time: r.time ?? '', duration: r.duration ?? '', equipment: (r.equipment || []).join(', '), visibility: r.visibility ?? false })
  }
  const submit = () => {
    if (!editing) { onCreate() } else {
      onUpdate(editing, {
        title: draft.title,
        ingredients: draft.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        instructions: draft.instructions,
        time: parseInt(draft.time) || 0,
        duration: parseInt(draft.duration) || 0,
        equipment: draft.equipment.split(',').map(s => s.trim()).filter(Boolean),
        visibility: draft.visibility
      })
    }
    setEditing(null)
    setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
  }
  return (
    <div className="admin-dashboard">
      <section className="panel">
        <h2>Admin: Manage Recipes</h2>
        <div className="form-row">
          <input placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <input placeholder="Time (min)" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} />
          <input placeholder="Duration (min)" value={draft.duration} onChange={e => setDraft({ ...draft, duration: e.target.value })} />
        </div>
        <div className="form-row">
          <input placeholder="Ingredients (comma separated)" value={draft.ingredients} onChange={e => setDraft({ ...draft, ingredients: e.target.value })} />
        </div>
        <div className="form-row">
          <input placeholder="Equipment (comma separated)" value={draft.equipment} onChange={e => setDraft({ ...draft, equipment: e.target.value })} />
        </div>
        <div className="form-row">
          <textarea placeholder="Instructions" value={draft.instructions} onChange={e => setDraft({ ...draft, instructions: e.target.value })} />
        </div>
        <div className="form-row checkbox-row">
          <label>Visibility</label>
          <input type="checkbox" checked={draft.visibility} onChange={e => setDraft({ ...draft, visibility: e.target.checked })} />
        </div>
        <div className="row">
          <button onClick={submit}>{editing ? 'Update Recipe' : 'Create Recipe'}</button>
        </div>
      </section>
      <section className="panel">
        <h3>All Recipes</h3>
        <div className="grid">
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Owner: {r.user_id} • Time: {r.time ?? '-'}m</div>
              <div className="card-actions">
                <button onClick={() => startEdit(r)}>Edit</button>
                <button onClick={() => onDelete(r.id)}>Delete</button>
                <button onClick={() => setViewing(viewing === r.id ? null : r.id)}>
                  {viewing === r.id ? 'Hide' : 'View'}
                </button>
              </div>
              {viewing === r.id && (
                <div className="recipe-view">
                  <div className="rv-title">{r.title}</div>
                  <div className="rv-meta">Time: {r.time ?? 0}m • Duration: {r.duration ?? 0}m</div>
                  <div className="rv-section">
                    <strong>Ingredients</strong>
                    <ul>
                      {(r.ingredients || []).map((ing, idx) => <li key={idx}>{ing}</li>)}
                    </ul>
                  </div>
                  <div className="rv-section">
                    <strong>Equipment</strong>
                    <ul>
                      {(r.equipment || []).map((eq, idx) => <li key={idx}>{eq}</li>)}
                    </ul>
                  </div>
                  <div className="rv-section">
                    <strong>Instructions</strong>
                    <ol>
                      {((typeof r.instructions === 'string') ? r.instructions.split(/\r?\n/).filter(s => s.trim()) : []).map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function RecipesDashboard({ saved, draft, setDraft, onCreate, onUnsave, onPreview }) {
  return (
    <div className="recipes-dashboard">
      <section className="panel">
        <h2>Create a Recipe</h2>
        <div className="form-row">
          <input placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <input placeholder="Time (min)" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} />
          <input placeholder="Duration (min)" value={draft.duration} onChange={e => setDraft({ ...draft, duration: e.target.value })} />
        </div>
        <div className="form-row">
          <input placeholder="Ingredients (comma separated)" value={draft.ingredients} onChange={e => setDraft({ ...draft, ingredients: e.target.value })} />
        </div>
        <div className="form-row">
          <input placeholder="Equipment (comma separated)" value={draft.equipment} onChange={e => setDraft({ ...draft, equipment: e.target.value })} />
        </div>
        <div className="form-row">
          <textarea placeholder="Instructions" value={draft.instructions} onChange={e => setDraft({ ...draft, instructions: e.target.value })} />
        </div>
        <div className="row">
          <button onClick={() => onCreate()}>Create Recipe</button>
        </div>
      </section>

      <section className="panel">
        <h3>Saved for you</h3>
        <div className="grid">
          {saved.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time ?? '-'}m • Owner: {r.user_id}</div>
              <div className="card-actions">
                <button onClick={() => onPreview(r)}>View</button>
                <button onClick={() => onUnsave(r.id)}>Unsave</button>
              </div>
            </div>
          ))}
          {saved.length === 0 && <p>No saved recipes yet.</p>}
        </div>
      </section>
    </div>
  )
}

function ExplorerDashboard({ recipes, savedIds, onSave, onUnsave, onPreview }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastRandomTitle, setLastRandomTitle] = useState('')
  const [isRandomizerExpanded, setIsRandomizerExpanded] = useState(false)

  function handleRandomize() {
    if (isSpinning || recipes.length === 0) return
    setIsSpinning(true)
    setLastRandomTitle('')
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * recipes.length)
      const selected = recipes[randomIndex]
      setLastRandomTitle(selected?.title || '')
      onPreview(selected)
      setIsSpinning(false)
    }, 700)
  }

  return (
    <div className="explore-dashboard">
      <section className="panel">
        <div className="panel-header" onClick={() => setIsRandomizerExpanded(!isRandomizerExpanded)}>
          <h3>Randomize Meal</h3>
          <button className="collapse-btn" type="button">{isRandomizerExpanded ? '−' : '+'}</button>
        </div>
        {isRandomizerExpanded && (
          <>
            <p>Need inspiration? Let us pick a random recipe from available recipes.</p>
            <div className="randomizer-actions">
              <button onClick={handleRandomize} disabled={isSpinning || recipes.length === 0}>
                {isSpinning ? 'Choosing...' : 'Randomize Recipe'}
              </button>
              {lastRandomTitle && <span className="randomizer-picked">Picked: {lastRandomTitle}</span>}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h3>Available Recipes</h3>
        <div className="grid">
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time ?? '-'}m • Owner: {r.user_id}</div>
              <div className="card-actions">
                {savedIds.has(r.id)
                  ? <button onClick={() => onUnsave(r.id)}>Unsave</button>
                  : <button onClick={() => onSave(r.id)}>Save</button>}
                <button onClick={() => onPreview(r)}>View</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function RecipePreviewModal({ item, onClose }) {
  if (!item) return null
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-label="Recipe preview">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <strong>{item.title}</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div>Time: {item.time ?? 0}m • Duration: {item.duration ?? 0}m</div>
          <div>
            <strong>Ingredients</strong>
            <ul>
              {(item.ingredients || []).map((ing, idx) => <li key={idx}>{ing}</li>)}
            </ul>
          </div>
          <div>
            <strong>Equipment</strong>
            <ul>
              {(item.equipment || []).map((eq, idx) => <li key={idx}>{eq}</li>)}
            </ul>
          </div>
          <div>
            <strong>Instructions</strong>
            <ol>
              {((typeof item.instructions === 'string') ? item.instructions.split(/\r?\n/).filter(s => s.trim()) : []).map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
