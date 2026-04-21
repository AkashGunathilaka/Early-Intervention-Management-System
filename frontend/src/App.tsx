import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { getToken } from './lib/auth'
import { setAuthToken } from './lib/api'

function App() {
  useEffect(() => {
    setAuthToken(getToken())
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
