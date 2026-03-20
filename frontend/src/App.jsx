import React, { useEffect, useMemo, useState } from 'react'
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, login, register, getSaved, saveRecipe, getPantry, addPantry, updatePantry, deletePantry } from './api.js'
import { useLocation, Link, Navigate, useNavigate } from 'react-router-dom'

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
  const [user, setUser] = useState({ role: 'user', id: 1 }) // TEMP: mock user for testing
  const [view, setView] = useState(location.pathname.replace('/', '') || 'explore') // TEMP: default to explore
  const [recipes, setRecipes] = useState([
    {
      id: 1,
      title: "Classic Spaghetti Carbonara",
      ingredients: ["200g spaghetti", "100g pancetta", "2 eggs", "50g parmesan", "Black pepper"],
      instructions: "Cook pasta. Fry pancetta. Mix eggs and cheese. Combine everything.",
      time: 15,
      duration: 20,
      equipment: ["pot", "pan", "bowl"],
      visibility: true,
      user_id: 1
    },
    {
      id: 2,
      title: "Chicken Stir Fry",
      ingredients: ["300g chicken breast", "2 bell peppers", "1 onion", "Soy sauce", "Ginger"],
      instructions: "Slice chicken and veggies. Stir fry chicken first, then add veggies. Season with soy sauce.",
      time: 10,
      duration: 15,
      equipment: ["wok", "knife"],
      visibility: true,
      user_id: 2
    }
  ]) // TEMP: mock recipes for testing
  const [saved, setSaved] = useState([])
  const [pantry, setPantry] = useState([])
  const [pantryDraft, setPantryDraft] = useState({ name: '', category: 'Grains', expiration_date: '', quantity: 1, unit: 'pcs', unit_system: 'metric', location: 'Pantry', notes: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = token
    if (t) {
      const payload = parseJwt(t)
      const u = payload?.sub
      // We can't reliably fetch user name from token; we'll keep role in payload if present
      if (payload) {
        setUser({ role: payload.role || 'user', id: payload.sub })
      }
      // fetch recipes for explorer/admin view
      // TEMP: skip API calls for testing
      // fetchRecipes(t)
      // fetchSaved(t)
    } else {
      // TEMP: keep mock user for testing
      // setUser(null)
      // setRecipes([])
      // setSaved([])
    }
    // eslint-disable-next-line
  }, [token])

  // Pantry loading on mount when token exists
  useEffect(() => {
    if (token) {
      getPantry(token).then(setPantry).catch(() => {})
    }
  }, [token])

  useEffect(() => {
    if (location.pathname) setView(location.pathname.replace('/', ''))
  }, [location.pathname])

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
      const payload = parseJwt(r.token)
      setUser({ id: payload?.sub, role: payload?.role || 'user' })
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
        const payload = parseJwt(loginRes.token)
        setUser({ id: payload?.sub, role: payload?.role || 'user' })
        navigate('/explore')
      }
    } else {
      alert('Registration failed: ' + (r.error || 'unknown'))
    }
  }

  const isAuthenticated = Boolean(token) || true // TEMP: bypass auth for testing
  const isAdmin = user?.role === 'admin'

  // Simple forms state for recipe creation/editing (shared by admin/explorer)
  const [draft, setDraft] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })

  // Create recipe handler (used by both admin and explorer, as appropriate on server)
  async function handleCreate() {
    // TEMP: simulate creating recipe locally
    const newRecipe = {
      id: Date.now(),
      title: draft.title,
      ingredients: draft.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      instructions: draft.instructions,
      time: parseInt(draft.time) || 0,
      duration: parseInt(draft.duration) || 0,
      equipment: draft.equipment.split(',').map(s => s.trim()).filter(Boolean),
      visibility: draft.visibility,
      user_id: user?.id || 1
    }
    setRecipes(prev => [...prev, newRecipe])
    setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    alert('Recipe created! (simulated)')
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
    // TEMP: simulate saving recipe locally
    const recipe = recipes.find(r => r.id === recipeId)
    if (recipe) {
      setSaved(prev => [...prev, recipe])
      alert('Recipe saved! (simulated)')
    }
  }

  // Pantry actions
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
          <button onClick={() => pantryDelete(p.id)}>Delete</button>
        </div>
      </div>
    )
  }
  const pantryView = (
    <div className="pantry-panel panel">
      <h2>Pantry</h2>
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
      <div className="pantry-list">
        {pantry.map(p => <ViewPantryCard p={p} key={p.id} />)}
      </div>
    </div>
  )

  const loginView = (
    <div className="auth-page">
      <h2>POV Cooking - Login</h2>
      {/* Inline login form for demo simplicity */}
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
      saved={saved}
      draft={draft}
      setDraft={setDraft}
      onCreate={handleCreate}
      onSave={handleSave}
    />
  )

  // Root layout with header
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">POV Cooking</div>
        <nav className="nav">
          <Link to="/explore" className="nav-link">Explorer</Link>
          {isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
          {!isAuthenticated ? (
            <Link to="/login" className="nav-link">Login</Link>
          ) : (
            <span className="nav-link">Role: {user?.role}</span>
          )}
        </nav>
      </header>
      <main className="content">
        {!isAuthenticated ? loginView : (window.location.pathname.startsWith('/pantry') ? pantryView : (isAdmin ? adminView : explorerView))}
      </main>
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

function ExplorerDashboard({ recipes, saved, draft, setDraft, onCreate, onSave }) {
  const [viewing, setViewing] = useState(null)
  return (
    <div className="explore-dashboard">
      <section className="panel">
        <h2>Explorer: Create a Recipe</h2>
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
        <h3>Available Recipes</h3>
        <div className="grid">
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time ?? '-'}m • Owner: {r.user_id}</div>
              <div className="card-actions">
                <button onClick={() => onSave(r.id)}>Save</button>
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
      <section className="panel">
        <h3>Saved for you</h3>
        <div className="grid">
          {saved.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
