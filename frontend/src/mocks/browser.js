// Lightweight in-browser mock to emulate a subset of MSW functionality
// This is a small, no-dependency fetch interceptor to test UI flows
let _started = false
export const worker = {
  start() {
    if (_started) return
    _started = true
    // In-memory mock store (per-session)
    window.__msw_store = {
      users: [
        { id: 1, username: 'tester', password: 'testpass', role: 'user' },
        { id: 2, username: 'tester_admin', password: 'adminpass', role: 'admin' }
      ],
      pantry: {
        1: [
          { id: 1, user_id: 1, name: 'Milk', category: 'Dairy', expiration_date: '2026-04-01', quantity: 1, unit: 'L', unit_system: 'metric', location: 'Fridge', notes: 'test item' }
        ],
        2: []
      },
      nextPantryId: 2,
      saved: {}
    }
    // Token helpers
    function makeToken(payload) {
      const b64 = typeof window !== 'undefined' ? btoa(JSON.stringify(payload)) : Buffer.from(JSON.stringify(payload)).toString('base64')
      return `header.${b64}.signature`
    }
    function parseToken(token) {
      try {
        const b64 = token.split('.')[1]
        const payload = typeof window !== 'undefined' ? JSON.parse(atob(b64)) : JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
        return payload
      } catch {
        return null
      }
    }
    const origFetch = window.fetch.bind(window)
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url
      const method = (init.method || 'GET').toUpperCase()
      const headers = new Headers(init.headers || {})
      const body = init.body ? JSON.parse(init.body) : null
      // Helpers
      const respond = (status, json) => new Response(JSON.stringify(json), {
        status,
        headers: { 'Content-Type': 'application/json' }
      })
      // Login
      if (url?.endsWith('/auth/login') && method === 'POST') {
        const { username, password } = body || {}
        const user = window.__msw_store.users.find(u => u.username === username && u.password === password)
        if (!user) return respond(401, { error: 'Invalid credentials' })
        const token = makeToken({ sub: user.id, username: user.username, role: user.role })
        return respond(200, { token })
      }
      // Pantry list
      if (url?.endsWith('/pantry') && method === 'GET') {
        const auth = init.headers?.Authorization || headers.get('Authorization')
        const token = auth ? auth.split(' ')[1] : null
        const payload = token ? parseToken(token) : null
        if (!payload) return respond(401, { error: 'Unauthorized' })
        const items = window.__msw_store.pantry[payload.sub] || []
        return respond(200, items)
      }
      // Pantry create
      if (url?.endsWith('/pantry') && method === 'POST') {
        const auth = init.headers?.Authorization || headers.get('Authorization')
        const token = auth ? auth.split(' ')[1] : null
        const payload = token ? parseToken(token) : null
        if (!payload) return respond(401, { error: 'Unauthorized' })
        const data = body || {}
        const list = window.__msw_store.pantry[payload.sub] = window.__msw_store.pantry[payload.sub] || []
        if (list.length >= 200) return respond(429, { error: 'Pantry item limit reached' })
        const item = {
          id: window.__msw_store.nextPantryId++,
          user_id: payload.sub,
          name: data.name,
          category: data.category,
          expiration_date: data.expiration_date || null,
          quantity: data.quantity ?? 1,
          unit: data.unit ?? 'pcs',
          unit_system: data.unit_system ?? 'metric',
          location: data.location ?? 'Pantry',
          notes: data.notes ?? '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        list.push(item)
        return respond(200, item)
      }
      // Pantry by id GET/PUT/DELETE
      if (url?.match(/\/pantry\/[0-9]+$/) && (method === 'GET' || method === 'PUT' || method === 'DELETE')) {
        const auth = init.headers?.Authorization || headers.get('Authorization')
        const token = auth ? auth.split(' ')[1] : null
        const payload = token ? parseToken(token) : null
        if (!payload) return respond(401, { error: 'Unauthorized' })
        const id = parseInt(url.split('/').pop())
        const list = window.__msw_store.pantry[payload.sub] || []
        const idx = list.findIndex(i => i.id === id)
        if (idx < 0) return respond(404, { error: 'Not found' })
        if (method === 'GET') return respond(200, list[idx])
        if (method === 'PUT') { const updates = body || {}; list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() }; return respond(200, list[idx]) }
        // DELETE
        list.splice(idx, 1); return respond(200, { ok: true })
      }
      // Saved (simple)
      if (url?.endsWith('/saved') && method === 'GET') {
        const auth = init.headers?.Authorization || headers.get('Authorization')
        const token = auth ? auth.split(' ')[1] : null
        const payload = token ? parseToken(token) : null
        if (!payload) return respond(401, { error: 'Unauthorized' })
        const items = window.__msw_store.saved[payload.sub] || []
        return respond(200, items)
      }
      if (url?.endsWith('/saved') && method === 'POST') {
        const auth = init.headers?.Authorization || headers.get('Authorization')
        const token = auth ? auth.split(' ')[1] : null
        const payload = token ? parseToken(token) : null
        if (!payload) return respond(401, { error: 'Unauthorized' })
        const data = body || {}
        window.__msw_store.saved = window.__msw_store.saved || {}
        const arr = window.__msw_store.saved[payload.sub] = window.__msw_store.saved[payload.sub] || []
        if (!arr.find(x => x.id === data.recipe_id)) arr.push({ id: data.recipe_id, title: 'Saved Recipe' })
        return respond(200, { ok: true })
      }
      return origFetch(input, init)
    }
  }
}
