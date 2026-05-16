// Auth context for the whole app 
// stores the current user, loading state and auth helper functions

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

// Used to track the last time the user interacted with the app 
const LAST_ACTIVE_KEY = 'eims_last_active_ms'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  // Load the current user from the backend using the saved token
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
      // If the token does not work , clear and treat the user as logged out
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

  // check for an existing login when the app first loads 
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshMe()
      } catch {
        // Stay logged out — refreshMe already cleaned up the bad token.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }

  }, [])

  // log the user out after some time of inactivity
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const timeoutMinutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 30)
    const timeoutMs = Math.max(1, timeoutMinutes) * 60_000

    const markActive = () => {
      const now = Date.now()
      const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0')
      if (!last || now - last > 5000) localStorage.setItem(LAST_ACTIVE_KEY, String(now))
    }

    
    markActive()

    // Any of these events bumps the "last active" timestamp.
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    for (const ev of events) window.addEventListener(ev, markActive, { passive: true })

    // Poll every 10s to see if the user has been inactive for too long 
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

  }, [user?.user_id])

  const value = useMemo<AuthState>(() => ({ user, loading, refreshMe, logout }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
