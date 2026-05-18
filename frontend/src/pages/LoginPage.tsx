import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, setAuthToken } from '../lib/api'
import { setToken } from '../lib/auth'
import { useAuth } from '../context/AuthContext'

type LoginResponse = { access_token: string; token_type: string }

const HIGHLIGHTS = [
  {
    title: 'Early risk detection',
    text: 'Spot students who may need support early.',
  },
  {
    title: 'Actionable profiles',
    text: 'Review risk levels, feature snapshots, prediction history, and intervention plans in one place.',
  },
  {
    title: 'Built For Educators',
    text: 'Monitor your cohorts with ease.',
  },
] as const

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
    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    try {
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
        // Route guards handle a bad session if /auth/me fails
      }

      const from = (loc.state as { from?: string } | null)?.from
      nav(typeof from === 'string' && from ? from : '/dashboard')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: string }).msg) : String(d))).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Login failed. Check your email and password.')
      }
    } finally {
      setLoading(false)
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
            A learning-analytics platform that helps universities identify at-risk students early and coordinate
            timely interventions before outcomes are final.
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
            Powered by machine learning trained on open university learning analytics data.
          </p>
        </div>
      </section>

      <section className="loginPanel" aria-label="Sign in">
        <div className="loginCard">
          <header className="loginCardHeader">
            <h2>Sign in</h2>
            <p className="muted">Use your staff or admin account to continue.</p>
          </header>

          <form className="loginForm" onSubmit={onSubmit}>
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
            <label className="loginField">
              <span>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {error ? <div className="error">{error}</div> : null}

            <button type="submit" className="loginSubmit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="loginForgot">
              <Link to="/reset-password">Forgot your password?</Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
