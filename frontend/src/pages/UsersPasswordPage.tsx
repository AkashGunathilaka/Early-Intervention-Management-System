import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { useAuth } from '../context/AuthContext'

// Simple account page where signed in users can change their password 

export function UsersPasswordPage() {
  const { user } = useAuth()

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHeader
        eyebrow="Settings"
        title="Accounts"
        lead={`Signed in as ${user?.email ?? ''}. Update your password below.`}
      />

      <Card>
        <ChangePasswordForm />
      </Card>
    </div>
  )
}
