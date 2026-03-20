import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Pantry from './pages/Pantry'
import Recipes from './pages/Recipes'
import Admin from './pages/Admin'
import Role from './pages/Role'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { worker } from './mocks/browser'

// Start MSW in development for testing API flows
if (import.meta.env.DEV) {
  worker.start({ onUnhandledRequest: 'warn' })
}
import './styles.css'

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pantry" element={<ProtectedRoute isAuthenticated={isAuthenticated && user?.role !== 'admin'}><Pantry /></ProtectedRoute>} />
      <Route path="/recipes" element={<ProtectedRoute isAuthenticated={isAuthenticated && user?.role !== 'admin'}><Recipes /></ProtectedRoute>} />
      <Route path="/role" element={<ProtectedRoute isAuthenticated={isAuthenticated && user?.role === 'admin'}><Role /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

const Root = () => (
  <AuthProvider>
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  </AuthProvider>
)

createRoot(document.getElementById('root')).render(<Root />)
