import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAuthToken } from '../lib/api'
import { clearToken, getToken } from '../lib/auth'

export type Me = {
  user_id: number
  full_name: string
  email: string
  role: string
  is_active: boolean
}

type AuthState = {
  user: Me | null
  loading: boolean
  refreshMe: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshMe() {
    const token = getToken()
    setAuthToken(token)
    if (!token) {
      setUser(null)
      return
    }

    try {
      const res = await api.get<Me>('/auth/me')
      setUser(res.data)
    } catch (err: any) {
      // token invalid/expired: clear it
      clearToken()
      setAuthToken(null)
      setUser(null)
      throw err
    }
  }

  function logout() {
    clearToken()
    setAuthToken(null)
    setUser(null)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshMe()
      } catch {
        // ignore; user stays logged out
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthState>(() => ({ user, loading, refreshMe, logout }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

