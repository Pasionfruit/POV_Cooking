import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  const handleLogin = (e) => {
    e.preventDefault()
    // TEMP: Simple mock login - accept any username/password
    if (credentials.username && credentials.password) {
      // Simulate login with mock user data
      login({ id: 1, username: credentials.username, role: 'admin' })
      alert(`Welcome back, ${credentials.username}! (simulated login)`)
      navigate('/')
    } else {
      alert('Please enter both username and password')
    }
  }

  return (
    <div className="login-page">
      <section className="panel" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2>Login to POV Cooking</h2>
        <form onSubmit={handleLogin}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />
          </div>
          <div className="row">
            <button type="submit">Login</button>
          </div>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>Demo: Enter any username and password to login</p>
        </div>
      </section>
    </div>
  )
}