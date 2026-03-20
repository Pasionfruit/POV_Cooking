import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const location = useLocation()
  const isAuthenticated = true // TEMP: bypass auth for testing
  const user = { role: 'admin', id: 1 } // TEMP: mock admin user

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          <Link to="/" className="nav-link">POV Cooking</Link>
        </div>
        <nav className="nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/pantry" className={`nav-link ${location.pathname === '/pantry' ? 'active' : ''}`}>Pantry</Link>
          {user?.role === 'admin' && (
            <>
              <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>Admin</Link>
              <Link to="/role" className={`nav-link ${location.pathname === '/role' ? 'active' : ''}`}>Roles</Link>
            </>
          )}
          <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>Settings</Link>
          {!isAuthenticated ? (
            <Link to="/login" className="nav-link">Login</Link>
          ) : (
            <span className="nav-link">Role: {user?.role}</span>
          )}
        </nav>
      </header>
      <main className="content">
        {children}
      </main>
    </div>
  )
}