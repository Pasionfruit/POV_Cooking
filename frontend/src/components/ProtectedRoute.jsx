import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return (
      <div className="access-denied">
        <section className="panel" style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p>Please log in with appropriate credentials or contact an administrator.</p>
        </section>
      </div>
    )
  }
  return children
}