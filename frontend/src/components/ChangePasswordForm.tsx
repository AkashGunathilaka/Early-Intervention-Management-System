import { type CSSProperties, type FormEvent, type ReactNode, useState } from 'react'
import { api } from '../lib/api'

type Props = {
  footer?: ReactNode
  formStyle?: CSSProperties
}

// Reusable change password form so the password update logic stays in one place
export function ChangePasswordForm({
  footer,
  formStyle = { display: 'grid', gap: 12, maxWidth: 520 },
}: Props) {
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
      setError('Please fill current password and new password.')
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
    <>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}
      <form onSubmit={onSubmit} style={formStyle}>
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
      {footer}
    </>
  )
}
