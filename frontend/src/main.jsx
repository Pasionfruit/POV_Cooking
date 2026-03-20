import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Pantry from './pages/Pantry'
import Admin from './pages/Admin'
import Role from './pages/Role'
import Settings from './pages/Settings'
import { worker } from './mocks/browser'

// Start MSW in development for testing API flows
if (import.meta.env.DEV) {
  worker.start({ onUnhandledRequest: 'warn' })
}
import './styles.css'

const Root = () => (
  <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/role" element={<Role />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  </BrowserRouter>
)

createRoot(document.getElementById('root')).render(<Root />)
