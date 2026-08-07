import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [fields, setFields] = useState({ email: '', password: '', name: '', adminCode: '' })
  const [showAdminCode, setShowAdminCode] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const googleButtonRef = useRef(null)

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

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
            navigate('/')
          } catch (err) {
            setError(err.message)
          }
        },
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 280,
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
  }, [login, navigate])

  function set(name, value) {
    setFields((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { token, user } =
        mode === 'login'
          ? await api.login({ email: fields.email, password: fields.password })
          : await api.register({
              email: fields.email,
              password: fields.password,
              name: fields.name || undefined,
              adminCode: fields.adminCode || undefined,
            })
      login(token, user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <h1>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h1>
      <div className="form-mode-row">
        <button type="button" className={mode === 'login' ? 'chip active' : 'chip'} onClick={() => setMode('login')}>
          Sign in
        </button>
        <button type="button" className={mode === 'register' ? 'chip active' : 'chip'} onClick={() => setMode('register')}>
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label>
            Name
            <input value={fields.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
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
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={fields.password}
            onChange={(e) => set('password', e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'register' &&
          (showAdminCode ? (
            <label>
              Admin code
              <input value={fields.adminCode} onChange={(e) => set('adminCode', e.target.value)} />
            </label>
          ) : (
            <button type="button" className="link-button muted" onClick={() => setShowAdminCode(true)}>
              Have an admin code?
            </button>
          ))}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="auth-divider">or</div>
      {GOOGLE_CLIENT_ID ? (
        <div ref={googleButtonRef} className="google-button" />
      ) : (
        <p className="muted small">
          Google sign-in isn’t configured yet — set <code>VITE_GOOGLE_CLIENT_ID</code> (frontend) and{' '}
          <code>GOOGLE_CLIENT_ID</code> (backend) to enable it.
        </p>
      )}
      <p className="muted small">Your email is stored encrypted; passwords are hashed with bcrypt.</p>
    </section>
  )
}
