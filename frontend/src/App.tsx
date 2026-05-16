// Main route setup for the frontend
// AuthProvider and DatasetProvider are kept here so every page can use them 

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
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DatasetProvider } from './context/DatasetContext'
import { UsersPasswordPage } from './pages/UsersPasswordPage'

function App() {
  // Make sure the saved login token is attached when the app starts
  useEffect(() => {
    setAuthToken(getToken())
  }, [])

  return (
    <AuthProvider>
      <DatasetProvider>
        <Routes>
          {/* Start users on the dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Pages that do not need login */}
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
          {/* Old account URLs now point to the same account page. */}
          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <Navigate to="/users" replace />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Navigate to="/users" replace />
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAuth>
                <AppLayout>
                  <UsersPasswordPage />
                </AppLayout>
              </RequireAuth>
            }
          />
          {/* Admin pages need both login and admin access. */}
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
          {/* Send unknown routes back to a safe page. */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DatasetProvider>
    </AuthProvider>
  )
}

export default App

