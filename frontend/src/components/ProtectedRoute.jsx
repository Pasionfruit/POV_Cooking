import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user, isAdmin } = useAuth()
  const location = useLocation()
  // Remember where the user was headed so Login can send them back.
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}
