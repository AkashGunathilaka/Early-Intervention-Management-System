import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../lib/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getToken()
  const loc = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  }

  return <>{children}</>
}

