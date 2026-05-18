import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'

function formatApiDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: { loc?: unknown[]; msg?: string }) => {
        const loc = Array.isArray(item?.loc) ? item.loc!.join('.') : ''
        const msg = item?.msg ?? ''
        return loc ? `${loc}: ${msg}` : msg
      })
      .filter(Boolean)
      .join('; ')
  }
  return fallback
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

// Admin page managing user accounts admins can create new users and view existing accounts

type User = {
  user_id: number
  full_name: string
  email: string
  role: string
  is_active: boolean
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')
  const [creating, setCreating] = useState(false)

  // Load users for the table
  async function loadUsers(cancelledRef?: { cancelled: boolean }) {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<User[]>('/users/')
      if (!cancelledRef?.cancelled) setUsers(res.data)
    } catch (err: any) {
      if (!cancelledRef?.cancelled) setError(formatApiDetail(err?.response?.data?.detail, 'Failed to load users (admin only)'))
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }

  // load the user list when the page opens
  useEffect(() => {
    const ref = { cancelled: false }
    loadUsers(ref)
    return () => {
      ref.cancelled = true
    }
  }, [])


  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill full name, email, and password.')
      return
    }

    const emailTrim = email.trim()
    if (!isValidEmail(emailTrim)) {
      setError('Please enter a valid email address (e.g. name@example.com).')
      return
    }

    setCreating(true)
    try {
      // create the user, then reload the table
      await api.post('/users/', {
        full_name: fullName.trim(),
        email: emailTrim,
        password,
        role,
      })
      setFullName('')
      setEmail('')
      setPassword('')
      setRole('staff')
      setMessage('User created')
      await loadUsers()
    } catch (err: any) {
      setError(formatApiDetail(err?.response?.data?.detail, 'Failed to create user'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Admin" title="Users" lead="Create staff accounts and manage who has access." />

      {loading ? <p>Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Create user">
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              Email
              <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        </Card>

        <Card title="All users">
          {users.length ? (
            <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td>{u.user_id}</td>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.is_active ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No users found.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
