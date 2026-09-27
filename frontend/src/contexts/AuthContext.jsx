import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pov_token'))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pov_user')) || null
    } catch {
      return null
    }
  })

  // Any 401 on an authenticated request means the session is stale
  // (expired token, wiped database) — log out so the UI never gets stuck.
  useEffect(() => {
    api.setUnauthorizedHandler(() => logout())
    return () => api.setUnauthorizedHandler(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-validate the stored session on load; drop it if the token is stale.
  useEffect(() => {
    if (!token) return
    api
      .me(token)
      .then(({ user }) => {
        setUser(user)
        localStorage.setItem('pov_user', JSON.stringify(user))
      })
      .catch(() => logout())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep a long-lived session actually long-lived: silently reissue the token
  // on a heartbeat and whenever the app is reopened/refocused (covers an
  // installed PWA left running for weeks), so an active user never hits the
  // backend's JWT_EXPIRES_IN wall. A failed refresh is a no-op — a genuinely
  // dead token already triggers logout via the 401 handler above.
  useEffect(() => {
    if (!token) return
    const HEARTBEAT_MS = 6 * 60 * 60 * 1000
    const MIN_GAP_MS = 60 * 60 * 1000
    let lastRefresh = 0

    function refresh() {
      if (Date.now() - lastRefresh < MIN_GAP_MS) return
      lastRefresh = Date.now()
      api
        .refreshToken(token)
        .then(({ token: fresh }) => {
          setToken(fresh)
          localStorage.setItem('pov_token', fresh)
        })
        .catch(() => {})
    }

    const interval = setInterval(refresh, HEARTBEAT_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [token])

  function login(newToken, newUser) {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('pov_token', newToken)
    localStorage.setItem('pov_user', JSON.stringify(newUser))
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('pov_token')
    localStorage.removeItem('pov_user')
  }

  const value = { token, user, isAdmin: user?.role === 'admin', login, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
