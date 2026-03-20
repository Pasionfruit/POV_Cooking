import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
    alert('Logged out successfully! (simulated)')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          <Link to="/" className="nav-link">POV Cooking</Link>
        </div>
        <nav className="nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          {isAuthenticated ? (
            <>
              <Link to="/pantry" className={`nav-link ${location.pathname === '/pantry' ? 'active' : ''}`}>Pantry</Link>
              {user?.role === 'admin' && (
                <>
                  <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>Admin</Link>
                  <Link to="/role" className={`nav-link ${location.pathname === '/role' ? 'active' : ''}`}>Roles</Link>
                </>
              )}
              <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>Settings</Link>
              <span className="nav-link">Role: {user?.role}</span>
              <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
            </>
          ) : (
            <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>Login</Link>
          )}
        </nav>
      </header>
      <main className="content">
        {children}
      </main>
    </div>
  )
}