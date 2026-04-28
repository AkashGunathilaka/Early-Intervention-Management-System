import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'

type ResetRequestResponse =
  | { message: string; reset_token?: string; expires_minutes?: number }
  | { detail: string }

export function ResetPasswordPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function onRequestToken(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!email) {
      setError('Enter your email.')
      return
    }

    setRequesting(true)
    try {
      const res = await api.post<ResetRequestResponse>('/auth/request-password-reset', { email })
      const anyRes: any = res.data
      setMessage(anyRes?.message ?? 'Request sent')
      if (anyRes?.reset_token) setToken(anyRes.reset_token)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to request reset token')
    } finally {
      setRequesting(false)
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!token || !newPassword) {
      setError('Provide the reset token and a new password.')
      return
    }

    setSaving(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword })
      setMessage('Password reset successfully. You can sign in now.')
      setTimeout(() => nav('/login'), 400)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="pageHeader">
        <h1>Reset password</h1>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        <Card title="1) Generate a reset token (prototype)">
          <form onSubmit={onRequestToken} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </label>
            <button type="submit" disabled={requesting}>
              {requesting ? 'Generating…' : 'Generate reset token'}
            </button>
            <p className="muted" style={{ margin: 0 }}>
              This project prototype returns the token directly instead of sending an email.
            </p>
          </form>
        </Card>

        <Card title="2) Reset your password">
          <form onSubmit={onResetPassword} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              Reset token
              <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={4} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              New password
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

