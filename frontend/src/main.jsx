import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

const Root = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<App view="login" />} />
      <Route path="/register" element={<App view="register" />} />
      <Route path="/admin" element={<App view="admin" />} />
      <Route path="/explore" element={<App view="explore" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </BrowserRouter>
)

createRoot(document.getElementById('root')).render(<Root />)
