import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatApiDetail } from '../lib/format'

type ResetRequestResponse = {
  message: string
  reset_token?: string | null
  expires_minutes?: number | null
}

const HIGHLIGHTS = [
  {
    title: 'Secure reset',
    text: 'Request a one-time token using your staff email, then choose a new password.',
  },
  {
    title: 'Privacy first',
    text: 'If no account exists for that email, you will see the same message with no token.',
  },
  {
    title: 'Back to work quickly',
    text: 'After resetting, return to sign in and continue supporting your students.',
  },
] as const

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

    const emailTrim = email.trim()
    if (!emailTrim) {
      setError('Enter your email.')
      return
    }

    setRequesting(true)
    try {
      const res = await api.post<ResetRequestResponse>('/auth/request-password-reset', {
        email: emailTrim,
      })
      const data = res.data
      setMessage(data.message || 'Request sent.')

      if (data.reset_token) {
        setToken(data.reset_token)
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(formatApiDetail(detail, 'Failed to request reset token'))
    } finally {
      setRequesting(false)
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!token.trim() || !newPassword) {
      setError('Provide the reset token and a new password.')
      return
    }

    setSaving(true)
    try {
      await api.post('/auth/reset-password', { token: token.trim(), new_password: newPassword })
      setMessage('Password reset successfully. You can sign in now.')
      setTimeout(() => nav('/login'), 400)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(formatApiDetail(detail, 'Failed to reset password'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="loginPage">
      <section className="loginBrand" aria-label="About this system">
        <div className="loginBrandInner">
          <div className="loginLogoRow">
            <img className="loginLogo" src="/logo.png" alt="EIMS logo" />
            <div>
              <div className="loginEyebrow">Early Intervention</div>
              <h1 className="loginTitle">Management System</h1>
            </div>
          </div>

          <p className="loginLead">
            Reset your password in two steps: request a token with your email, then set a new password before it
            expires.
          </p>

          <ul className="loginHighlights">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="loginHighlight">
                <span className="loginHighlightDot" aria-hidden />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="loginFootnote">
            <Link to="/login">← Back to sign in</Link>
          </p>
        </div>
      </section>

      <section className="loginPanel loginPanelScroll" aria-label="Reset password">
        <div className="loginPanelStack">
          {error ? <div className="error loginAlert">{error}</div> : null}
          {message ? <div className="success loginAlert">{message}</div> : null}

          <div className="loginCard">
            <header className="loginCardHeader">
              <h2>1. Get reset token</h2>
              <p className="muted">Enter the email linked to your staff account.</p>
            </header>

            <form className="loginForm" onSubmit={onRequestToken}>
              <label className="loginField">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="username"
                  placeholder="you@university.ac.uk"
                />
              </label>
              <button type="submit" className="loginSubmit" disabled={requesting}>
                {requesting ? 'Generating…' : 'Generate reset token'}
              </button>
            </form>
          </div>

          <div className="loginCard">
            <header className="loginCardHeader">
              <h2>2. Set new password</h2>
              <p className="muted">Paste the token from step 1, then choose a new password.</p>
            </header>

            <form className="loginForm" onSubmit={onResetPassword}>
              <label className="loginField">
                <span>Reset token</span>
                <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={4} />
              </label>
              <label className="loginField">
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" className="loginSubmit" disabled={saving}>
                {saving ? 'Saving…' : 'Reset password'}
              </button>
            </form>
          </div>

          <p className="loginForgot">
            <Link to="/login">← Back to sign in</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
