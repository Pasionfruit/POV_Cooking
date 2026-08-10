import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
// Demo credentials are a development convenience, never a production hint.
const SHOW_DEMO = import.meta.env.DEV

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from || '/'
  const [mode, setMode] = useState('login')
  const [fields, setFields] = useState({ email: '', password: '', name: '', adminCode: '' })
  const [showAdminCode, setShowAdminCode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const googleButtonRef = useRef(null)

  const isRegister = mode === 'register'

  useEffect(() => {
    if (user) navigate(destination)
  }, [user, navigate, destination])

  // Google Sign-In: load the Identity Services script and render the button.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    function renderButton() {
      if (!window.google || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const { token, user } = await api.googleLogin(credential)
            login(token, user)
            navigate(destination)
          } catch (err) {
            setError(err.message)
          }
        },
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'center',
        width: 320,
      })
    }
    if (window.google) {
      renderButton()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = renderButton
    document.head.appendChild(script)
  }, [login, navigate, destination])

  function set(name, value) {
    setFields((f) => ({ ...f, [name]: value }))
  }

  function switchMode(next) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { token, user } = isRegister
        ? await api.register({
            email: fields.email,
            password: fields.password,
            name: fields.name || undefined,
            adminCode: fields.adminCode || undefined,
          })
        : await api.login({ email: fields.email, password: fields.password })
      login(token, user)
      navigate(destination)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-head">
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted small">
          {isRegister
            ? 'Save recipes, plan your week, and track what’s in your fridge.'
            : 'Sign in to get to your cookbook, meal plan, and pantry.'}
        </p>
      </div>

      {GOOGLE_CLIENT_ID && (
        <>
          <div ref={googleButtonRef} className="google-button" />
          <div className="auth-divider">
            <span>or use your email</span>
          </div>
        </>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {isRegister && (
          <label>
            Name
            <input
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="name"
              placeholder="What should we call you?"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={fields.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={isRegister ? 'At least 8 characters' : ''}
            />
            <button
              type="button"
              className="link-button password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>

        {isRegister &&
          (showAdminCode ? (
            <label>
              Admin code
              <input
                value={fields.adminCode}
                onChange={(e) => set('adminCode', e.target.value)}
                autoComplete="off"
                placeholder="Only if you were given one"
              />
            </label>
          ) : (
            <button type="button" className="link-button auth-inline-link" onClick={() => setShowAdminCode(true)}>
              Have an admin code?
            </button>
          ))}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary auth-submit" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch muted small">
        {isRegister ? 'Already have an account?' : 'New here?'}{' '}
        <button type="button" className="link-button" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
          {isRegister ? 'Sign in' : 'Create an account'}
        </button>
      </p>

      {SHOW_DEMO && (
        <p className="auth-note muted small">
          Demo login: <code>demo@povcooking.com</code> / <code>demo1234</code>
        </p>
      )}
      <p className="auth-note muted small">Emails are stored encrypted and passwords are hashed with bcrypt.</p>
    </section>
  )
}
