import { type FormEvent, useState } from 'react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!currentPassword || !newPassword) {
      setError('Please fill both fields.')
      return
    }

    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password updated')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="pageHeader">
        <h1>Change password</h1>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      <Card title="Update your password">
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            Current password
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            New password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </Card>
    </div>
  )
}

