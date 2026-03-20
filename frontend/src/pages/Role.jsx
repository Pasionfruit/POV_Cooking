import React, { useState } from 'react'

export default function Role() {
  const [users, setUsers] = useState([
    { id: 1, username: 'chef_alice', role: 'admin', email: 'alice@example.com' },
    { id: 2, username: 'home_cook_bob', role: 'user', email: 'bob@example.com' },
    { id: 3, username: 'foodie_charlie', role: 'user', email: 'charlie@example.com' }
  ])

  const handleRoleChange = (userId, newRole) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, role: newRole } : user
    ))
    alert(`User role updated to ${newRole}! (simulated)`)
  }

  const handleDeleteUser = (userId) => {
    setUsers(prev => prev.filter(user => user.id !== userId))
    alert('User removed! (simulated)')
  }

  return (
    <div className="role-page">
      <section className="panel">
        <h2>User Role Management</h2>
        <p>Manage user roles and permissions across the platform.</p>
      </section>

      <section className="panel">
        <h3>User Roles</h3>
        <div className="grid">
          {users.map(user => (
            <div key={user.id} className="card">
              <div className="card-title">{user.username}</div>
              <div className="card-meta">
                Email: {user.email} • Current Role: <strong>{user.role}</strong>
              </div>
              <div className="card-actions">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => handleDeleteUser(user.id)}>Remove User</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Role Permissions</h3>
        <div className="permissions-grid">
          <div className="permission-card">
            <h4>User Role</h4>
            <ul>
              <li>✓ Create and manage own recipes</li>
              <li>✓ Save recipes to personal collection</li>
              <li>✓ View public recipes</li>
              <li>✓ Manage personal pantry</li>
              <li>✗ Manage other users</li>
              <li>✗ Change recipe visibility</li>
            </ul>
          </div>
          <div className="permission-card">
            <h4>Admin Role</h4>
            <ul>
              <li>✓ All User permissions</li>
              <li>✓ Create and edit all recipes</li>
              <li>✓ Change recipe visibility</li>
              <li>✓ Manage user roles</li>
              <li>✓ Delete any recipe</li>
              <li>✓ Access admin dashboard</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}