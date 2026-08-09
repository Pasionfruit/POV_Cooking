import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeIcon from './ThemeIcon'
import { toggleTheme } from '../lib/theme'

export default function NavBar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        POV Cooking
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end>
          Home
        </NavLink>
        {user && <NavLink to="/saved">Saved</NavLink>}
        {user && <NavLink to="/meal-plan">Meal Plan</NavLink>}
        {user && <NavLink to="/pantry">Pantry</NavLink>}
        {user && <NavLink to="/suggest">Suggest</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <button className="link-button" onClick={handleLogout}>
            Log out{user.name ? ` (${user.name})` : ''}
          </button>
        ) : (
          <NavLink to="/login">Log in</NavLink>
        )}
        <button
          className="theme-toggle"
          onClick={() => setTheme(toggleTheme())}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <ThemeIcon theme={theme} />
        </button>
      </nav>
    </header>
  )
}
