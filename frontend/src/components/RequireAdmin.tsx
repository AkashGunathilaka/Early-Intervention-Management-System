import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <p style={{ padding: 16 }}>Loading…</p>

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ maxWidth: 700, margin: '32px auto', padding: 16 }}>
        <h1 style={{ marginTop: 0 }}>Admin access required</h1>
        <p style={{ color: '#6b7280' }}>
          Your account doesn’t have admin permissions. Please sign in with an admin account to access this page.
        </p>
        <Link to="/dashboard">← Back to dashboard</Link>
      </div>
    )
  }

  return <>{children}</>
}

