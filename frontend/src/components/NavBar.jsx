import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeIcon from './ThemeIcon'
import NavIcon from './NavIcon'
import { toggleTheme } from '../lib/theme'

const ICON_LINKS = [
  { to: '/meal-plan', icon: 'meal-plan', label: 'Meal Plan' },
  { to: '/pantry', icon: 'pantry', label: 'Pantry' },
]

export default function NavBar() {
  const { user, isAdmin } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location, user])

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        POV Cooking
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end className="nav-icon" title="Home" aria-label="Home">
          <NavIcon name="home" />
        </NavLink>
        {user &&
          ICON_LINKS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className="nav-icon" title={label} aria-label={label}>
              <NavIcon name={icon} />
            </NavLink>
          ))}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <div className="nav-menu" ref={menuRef} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
          }}>
            <button
              ref={menuButtonRef}
              type="button"
              className="nav-menu-toggle"
              aria-label="Account menu"
              title="Account menu"
              aria-expanded={menuOpen}
              aria-controls="account-menu-links"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <div className="nav-menu-links" id="account-menu-links">
                <NavLink to="/profile" onClick={() => setMenuOpen(false)}>Profile</NavLink>
                <NavLink to="/group" onClick={() => setMenuOpen(false)}>Group</NavLink>
                <NavLink to="/suggest" onClick={() => setMenuOpen(false)}>Suggest a recipe</NavLink>
              </div>
            )}
          </div>
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
