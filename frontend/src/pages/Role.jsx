import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Role() {
  const { user } = useAuth()

  return (
    <div className="role-page">
      <section className="panel">
        <h2>{user?.username || 'Admin'}</h2>
        <p>Administrator dashboard and user management.</p>
      </section>

      <section className="panel">
        <h3>Role Information</h3>
        <div className="role-info">
          <div className="info-item">
            <strong>Username:</strong> {user?.username || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Role:</strong> {user?.role || 'N/A'}
          </div>
          <div className="info-item">
            <strong>User ID:</strong> {user?.id || 'N/A'}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Admin Permissions</h3>
        <div className="permissions-list">
          <div className="permission-item">
            <span className="permission-icon">✓</span>
            <span>Manage all recipes</span>
          </div>
          <div className="permission-item">
            <span className="permission-icon">✓</span>
            <span>Manage user roles</span>
          </div>
          <div className="permission-item">
            <span className="permission-icon">✓</span>
            <span>Access admin dashboard</span>
          </div>
          <div className="permission-item">
            <span className="permission-icon">✓</span>
            <span>Delete any content</span>
          </div>
        </div>
      </section>
    </div>
  )
}