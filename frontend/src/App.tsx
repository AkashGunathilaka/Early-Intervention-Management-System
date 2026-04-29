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
import { StudentPredictionsPage } from './pages/StudentPredictionsPage'
import { StudentSnapshotsPage } from './pages/StudentSnapshotsPage'
import { AppLayout } from './components/AppLayout'
import { AdminModelsPage } from './pages/admin/AdminModelsPage'
import { AdminMLPage } from './pages/admin/AdminMLPage'
import { AdminRiskThresholdsPage } from './pages/admin/AdminRiskThresholdsPage'
import { AdminDataPage } from './pages/admin/AdminDataPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AuthProvider } from './context/AuthContext'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DatasetProvider } from './context/DatasetContext'

function App() {
  useEffect(() => {
    setAuthToken(getToken())
  }, [])

  return (
    <AuthProvider>
      <DatasetProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            path="/students/:id/predictions"
            element={
              <RequireAuth>
                <AppLayout>
                  <StudentPredictionsPage />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/students/:id/snapshots"
            element={
              <RequireAuth>
                <AppLayout>
                  <StudentSnapshotsPage />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <AppLayout>
                  <ChangePasswordPage />
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
            path="/admin/ml"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppLayout>
                    <AdminMLPage />
                  </AppLayout>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/data"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppLayout>
                    <AdminDataPage />
                  </AppLayout>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppLayout>
                    <AdminUsersPage />
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
      </DatasetProvider>
    </AuthProvider>
  )
}

export default App

