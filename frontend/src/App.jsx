import React, { useEffect, useMemo, useState } from 'react'
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, login, register, getSaved, saveRecipe } from './api.js'
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
  const [user, setUser] = useState(null)
  const [view, setView] = useState(location.pathname.replace('/', '') || 'explore')
  const [recipes, setRecipes] = useState([])
  const [saved, setSaved] = useState([])
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
      fetchRecipes(t)
      fetchSaved(t)
    } else {
      setUser(null)
      setRecipes([])
      setSaved([])
    }
    // eslint-disable-next-line
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

  const isAuthenticated = Boolean(token)
  const isAdmin = user?.role === 'admin'

  // Simple forms state for recipe creation/editing (shared by admin/explorer)
  const [draft, setDraft] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })

  // Create recipe handler (used by both admin and explorer, as appropriate on server)
  async function handleCreate() {
    if (!token) { alert('Please login'); return }
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
      // refresh
      fetchRecipes(token)
      setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    } else {
      alert('Create failed: ' + (res.error || 'unknown'))
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
    await saveRecipe(token, recipeId)
    fetchSaved(token)
  }

  // Simple views
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
        {!isAuthenticated ? loginView : (isAdmin ? adminView : explorerView)}
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
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ExplorerDashboard({ recipes, saved, draft, setDraft, onCreate, onSave }) {
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
              </div>
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
