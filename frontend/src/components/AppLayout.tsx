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

  return (
    <div>
      <header className="topbar">
        <div className="topbarInner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand">EIMS</div>
            <nav className="navLinks">
              <Link to="/dashboard" className={`navLink ${isActive('/dashboard') ? 'navLinkActive' : ''}`}>
                Dashboard
              </Link>
              <Link to="/students" className={`navLink ${isActive('/students') ? 'navLinkActive' : ''}`}>
                Students
              </Link>
              <Link to="/change-password" className={`navLink ${isActive('/change-password') ? 'navLinkActive' : ''}`}>
                Password
              </Link>
              {user?.role === 'admin' ? (
                <>
                  <Link to="/admin/models" className={`navLink ${isActive('/admin/models') ? 'navLinkActive' : ''}`}>
                    Models
                  </Link>
                  <Link to="/admin/ml" className={`navLink ${isActive('/admin/ml') ? 'navLinkActive' : ''}`}>
                    ML
                  </Link>
                  <Link to="/admin/data" className={`navLink ${isActive('/admin/data') ? 'navLinkActive' : ''}`}>
                    Data
                  </Link>
                  <Link to="/admin/users" className={`navLink ${isActive('/admin/users') ? 'navLinkActive' : ''}`}>
                    Users
                  </Link>
                  <Link to="/admin/risk-thresholds" className={`navLink ${isActive('/admin/risk-thresholds') ? 'navLinkActive' : ''}`}>
                    Thresholds
                  </Link>
                </>
              ) : null}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: 'var(--text)', fontSize: 12 }}>{user?.email ?? ''}</div>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

