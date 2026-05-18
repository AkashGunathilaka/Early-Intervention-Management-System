// Layout used for logged in pages showing the top navigation, logout button and the page content

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <Link to="/dashboard" className="brand" aria-label="Go to dashboard">
              <img className="topbarLogo" src="/logo.png" alt="Early Intervention Management System" />
            </Link>
            <nav className="navLinks" aria-label="Main">
              <Link to="/dashboard" className={`navLink ${isActive('/dashboard') ? 'navLinkActive' : ''}`}>
                Dashboard
              </Link>
              <Link to="/students" className={`navLink ${isActive('/students') ? 'navLinkActive' : ''}`}>
                Students
              </Link>
              <Link to="/users" className={`navLink ${isActive('/users') ? 'navLinkActive' : ''}`}>
                Accounts
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
                  <Link
                    to="/admin/risk-thresholds"
                    className={`navLink ${isActive('/admin/risk-thresholds') ? 'navLinkActive' : ''}`}
                  >
                    Thresholds
                  </Link>
                </>
              ) : null}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ color: 'var(--text)', fontSize: 12 }}>{user?.email ?? ''}</div>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="appMain">{children}</main>
    </div>
  )
}
