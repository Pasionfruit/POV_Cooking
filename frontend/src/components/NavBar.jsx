import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeIcon from './ThemeIcon'
import NavIcon from './NavIcon'
import { toggleTheme } from '../lib/theme'

const ICON_LINKS = [
  { to: '/saved', icon: 'saved', label: 'Saved' },
  { to: '/meal-plan', icon: 'meal-plan', label: 'Meal Plan' },
  { to: '/pantry', icon: 'pantry', label: 'Pantry' },
  { to: '/grocery-list', icon: 'grocery-list', label: 'Grocery List' },
  { to: '/suggest', icon: 'suggest', label: 'Suggest' },
]

export default function NavBar() {
  const { user, isAdmin } = useAuth()
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        POV Cooking
      </Link>
      <nav className="nav-links">
        {user &&
          ICON_LINKS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className="nav-icon" title={label} aria-label={label}>
              <NavIcon name={icon} />
            </NavLink>
          ))}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <NavLink
            to="/profile"
            className="nav-icon"
            title={user.name ? `Profile (${user.name})` : 'Profile'}
            aria-label="Profile"
          >
            <NavIcon name="profile" />
          </NavLink>
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
