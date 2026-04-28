import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'

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

  async function loadUsers(cancelledRef?: { cancelled: boolean }) {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<User[]>('/users/')
      if (!cancelledRef?.cancelled) setUsers(res.data)
    } catch (err: any) {
      if (!cancelledRef?.cancelled) setError(err?.response?.data?.detail ?? 'Failed to load users (admin only)')
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }

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

    setCreating(true)
    try {
      await api.post('/users/', {
        full_name: fullName.trim(),
        email: email.trim(),
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
      setError(err?.response?.data?.detail ?? 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Admin — Users</h1>
      </div>
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
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
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

