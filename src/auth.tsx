import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { apiFetch, ensureCsrfCookie, getStoredAuthState, setStoredAuthState, setStoredAuthToken } from './api'

type User = {
  id: number
  username: string
  full_name?: string
  first_name?: string
  last_name?: string
  email?: string
  target_level?: 'N5' | 'N4'
  total_points?: number
  subscription_status?: 'free' | 'paid'
  streak_count?: number
  referral_code?: string
  growth_theme?: 'bodybuilder' | 'tree' | 'city'
}

type AuthState = {
  authenticated: boolean
  user?: User
}

type AuthContextValue = {
  state: AuthState | null
  refresh: () => Promise<void>
  login: (username: string, password: string, otp?: string) => Promise<void>
  register: (args: RegisterArgs) => Promise<{ otpSetupRequired: false } | { otpSetupRequired: true; totp: TotpSetup }>
  confirmTotp: (setupToken: string, otp: string) => Promise<void>
  logout: () => Promise<void>
}

export type TotpSetup = {
  setup_token: string
  secret: string
  otpauth_url: string
  issuer?: string
}

export type RegisterArgs = {
  username: string
  password: string
  email: string
  first_name?: string
  last_name?: string
  target_level: 'N5' | 'N4'
  referral_code?: string
  role?: string
  college_id?: number
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Restore cached auth state for instant load (no loading flash)
  const [state, setState] = useState<AuthState | null>(() => getStoredAuthState())

  function updateState(s: AuthState, token?: string) {
    setState(s)
    setStoredAuthState(s)
    if (token) setStoredAuthToken(token)
  }

  async function refresh() {
    try {
      const me = await apiFetch<AuthState>('/api/auth/me/')
      // apiFetch only resolves here on 2xx. Always trust the server on success.
      setState(me)
      setStoredAuthState(me)
    } catch (e: any) {
      // Only clear auth if the server explicitly rejects the token (401/403).
      // Network errors, timeouts, 5xx — keep the cached logged-in state so the
      // user isn't forced to re-login just because the network hiccupped on resume.
      const status = typeof e?.status === 'number' ? e.status : null
      if (status === 401 || status === 403) {
        setState({ authenticated: false })
        setStoredAuthState(null)
        setStoredAuthToken(null)
      }
      // All other errors (null, 0, 5xx, network-down): silently keep cached state.
    }
  }

  async function login(identifier: string, password: string, otp?: string) {
    await ensureCsrfCookie()
    const res = await apiFetch<AuthState & { token?: string }>('/api/auth/login/', { method: 'POST', json: { identifier, password, otp } })
    updateState(res, res.token)
  }

  async function register(args: RegisterArgs): Promise<{ otpSetupRequired: false } | { otpSetupRequired: true; totp: TotpSetup }> {
    await ensureCsrfCookie()
    const res = await apiFetch<any>('/api/auth/register/', { method: 'POST', json: args })
    if (res?.otp_setup_required && res?.totp) {
      return { otpSetupRequired: true as const, totp: res.totp as TotpSetup }
    }
    updateState(res as AuthState, res?.token)
    return { otpSetupRequired: false as const }
  }

  async function confirmTotp(setupToken: string, otp: string) {
    await ensureCsrfCookie()
    const res = await apiFetch<AuthState & { token?: string }>('/api/auth/totp/confirm/', { method: 'POST', json: { setup_token: setupToken, otp } })
    updateState(res, res.token)
  }

  async function logout() {
    await ensureCsrfCookie()
    await apiFetch<AuthState>('/api/auth/logout/', { method: 'POST' })
    setState({ authenticated: false })
    setStoredAuthState(null)
    setStoredAuthToken(null)
  }

  useEffect(() => {
    // Always validate cached state with server in background
    refresh()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ state, refresh, login, register, confirmTotp, logout }), [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
