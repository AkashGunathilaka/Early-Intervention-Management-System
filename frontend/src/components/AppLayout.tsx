import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout: doLogout } = useAuth()

  function logout() {
    doLogout()
    nav('/login')
  }

  const isActive = (path: string) => (loc.pathname === path ? true : loc.pathname.startsWith(path + '/'))

  const linkStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 10px',
    borderRadius: 10,
    textDecoration: 'none',
    color: active ? '#111827' : '#374151',
    background: active ? '#f3f4f6' : 'transparent',
    fontWeight: active ? 700 : 500,
  })

  return (
    <div>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 800 }}>EIMS</div>
            <nav style={{ display: 'flex', gap: 6 }}>
              <Link to="/dashboard" style={linkStyle(isActive('/dashboard'))}>
                Dashboard
              </Link>
              <Link to="/students" style={linkStyle(isActive('/students'))}>
                Students
              </Link>
              {user?.role === 'admin' ? (
                <>
                  <Link to="/admin/models" style={linkStyle(isActive('/admin/models'))}>
                    Models
                  </Link>
                  <Link to="/admin/risk-thresholds" style={linkStyle(isActive('/admin/risk-thresholds'))}>
                    Thresholds
                  </Link>
                </>
              ) : null}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{user?.email ?? ''}</div>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

