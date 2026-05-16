import { Card } from '../components/ui/Card'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { useAuth } from '../context/AuthContext'

// Simple account page where signed in users can change their password 

export function UsersPasswordPage() {
  const { user } = useAuth()

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="pageHeader">
        <div>
          <h1>Accounts</h1>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Signed in as <strong style={{ color: 'var(--text-h)' }}>{user?.email ?? ''}</strong>
          </div>
        </div>
      </div>

      <Card>
        <ChangePasswordForm />
      </Card>
    </div>
  )
}
