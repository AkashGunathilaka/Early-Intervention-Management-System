import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, setAuthToken } from '../lib/api'
import { setToken } from '../lib/auth'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

type LoginResponse = { access_token: string; token_type: string }

export function LoginPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const { refreshMe } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded
      const body = new URLSearchParams()
      body.set('username', email)
      body.set('password', password)

      const res = await api.post<LoginResponse>('/auth/login', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      setToken(res.data.access_token)
      setAuthToken(res.data.access_token)
      try {
        await refreshMe()
      } catch {
        // ignore; route guard will handle if token invalid
      }

      const from = (loc.state as any)?.from
      nav(typeof from === 'string' && from ? from : '/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 520, marginTop: 56 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, letterSpacing: 0.12, color: 'var(--text)' }}>EIMS</div>
          <h1 style={{ lineHeight: 1.1 }}>Early Intervention Management System</h1>
          <p className="muted">Sign in to continue</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <Link to="/reset-password" className="muted" style={{ fontSize: 13 }}>
              Forgot password?
            </Link>
            <Link to="/change-password" className="muted" style={{ fontSize: 13 }}>
              Change password
            </Link>
          </div>
          {error ? <div className="error">{error}</div> : null}
        </form>
      </div>
    </div>
  )
}

