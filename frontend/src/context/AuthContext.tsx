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

const LAST_ACTIVE_KEY = 'eims_last_active_ms'

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

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const timeoutMinutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 30)
    const timeoutMs = Math.max(1, timeoutMinutes) * 60_000

    const markActive = () => {
      // avoid excessive localStorage writes; 1 write per ~5s max
      const now = Date.now()
      const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0')
      if (!last || now - last > 5000) localStorage.setItem(LAST_ACTIVE_KEY, String(now))
    }

    // initialize on load
    markActive()

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    for (const ev of events) window.addEventListener(ev, markActive, { passive: true })

    const interval = window.setInterval(() => {
      const now = Date.now()
      const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0')
      const idleFor = now - (last || 0)
      if (idleFor >= timeoutMs) {
        logout()
        if (window.location.pathname !== '/login') window.location.assign('/login')
      }
    }, 10_000)

    return () => {
      window.clearInterval(interval)
      for (const ev of events) window.removeEventListener(ev, markActive)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id])

  const value = useMemo<AuthState>(() => ({ user, loading, refreshMe, logout }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

