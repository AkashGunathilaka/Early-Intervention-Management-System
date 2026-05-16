// Layout used for logged in pages showing the top navigation, logout button and the page content

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout: doLogout } = useAuth()

  // log the user out and send them back to the login 
  function logout() {
    doLogout()
    nav('/login')
  }

  // mark the current page as active in the navigation
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
              <Link to="/users" className={`navLink ${isActive('/users') ? 'navLinkActive' : ''}`}>
                Accounts
              </Link>
              {/* only show the admin links if the user is an admin */}
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

