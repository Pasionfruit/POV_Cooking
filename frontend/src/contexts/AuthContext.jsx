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
