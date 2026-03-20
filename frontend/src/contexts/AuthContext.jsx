import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true) // TEMP: bypass auth for testing
  const [user, setUser] = useState({ role: 'admin', id: 1 }) // TEMP: mock admin user

  const login = (userData) => {
    setIsAuthenticated(true)
    setUser(userData)
    localStorage.setItem('pov_token', 'mock-token')
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('pov_token')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}