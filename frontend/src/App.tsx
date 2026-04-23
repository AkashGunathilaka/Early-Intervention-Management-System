import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { getToken } from './lib/auth'
import { setAuthToken } from './lib/api'
import { RequireAuth } from './components/RequireAuth'
import { RequireAdmin } from './components/RequireAdmin'
import { StudentsPage } from './pages/StudentsPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { AppLayout } from './components/AppLayout'
import { AdminModelsPage } from './pages/admin/AdminModelsPage'
import { AdminRiskThresholdsPage } from './pages/admin/AdminRiskThresholdsPage'
import { AuthProvider } from './context/AuthContext'

function App() {
  useEffect(() => {
    setAuthToken(getToken())
  }, [])

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/students"
          element={
            <RequireAuth>
              <AppLayout>
                <StudentsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/students/:id"
          element={
            <RequireAuth>
              <AppLayout>
                <StudentProfilePage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/models"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AppLayout>
                  <AdminModelsPage />
                </AppLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/risk-thresholds"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AppLayout>
                  <AdminRiskThresholdsPage />
                </AppLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

