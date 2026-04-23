import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, setAuthToken } from '../lib/api'
import { setToken } from '../lib/auth'
import { useAuth } from '../context/AuthContext'

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
    <div style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1 style={{ margin: 0, lineHeight: 1.15 }}>Early Intervention System</h1>
      <p style={{ marginTop: 8, marginBottom: 24, color: '#6b7280' }}>Sign in to continue</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
      </form>
    </div>
  )
}

