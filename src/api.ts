import { Capacitor } from '@capacitor/core'

export type ApiError = {
  detail?: string
  [key: string]: unknown
}

const AUTH_TOKEN_KEY = 'bengo_auth_token'
const AUTH_STATE_KEY = 'bengo_auth_state'

const DEFAULT_NATIVE_API_BASE_URL = 'https://jback.zynix.us'

function normalizeBaseUrl(value: string): string {
  let s = (value ?? '').trim()
  if (!s) return ''

  // Strip wrapping quotes (common when copying env vars)
  s = s.replace(/^['\"]+/, '').replace(/['\"]+$/, '')

  // Fix common copy/paste typos where :// becomes "//
  s = s.replace(/^https"\/+/, 'https://')
  s = s.replace(/^http"\/+/, 'http://')

  return s.replace(/\/+$/, '')
}

function isNativeRuntime(): boolean {
  // Prefer official API.
  try {
    return Capacitor.isNativePlatform()
  } catch {
    // ignore
  }

  // Fallback: check global (some WebView contexts behave differently)
  try {
    const w = globalThis as any
    if (w?.Capacitor?.isNativePlatform?.()) return true
    const platform = w?.Capacitor?.getPlatform?.()
    if (platform && platform !== 'web') return true
  } catch {
    // ignore
  }

  return false
}

function getApiBaseUrl(): string {
  // Always use the production backend for native (Android/iOS)
  // Allow override via env for different VPS domains.
  if (isNativeRuntime()) {
    const envNativeBase = (import.meta as any)?.env?.VITE_NATIVE_API_BASE_URL as string | undefined
    if (envNativeBase && envNativeBase.trim()) return normalizeBaseUrl(envNativeBase)
    return normalizeBaseUrl(DEFAULT_NATIVE_API_BASE_URL)
  }
  // For web, use env or fallback
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
  if (envBase && envBase.trim()) return normalizeBaseUrl(envBase)
  return ''
}

let apiBaseUrlCache: string | null = null
function getResolvedApiBaseUrl(): string {
  // Don’t permanently cache an empty value (native platform detection can be
  // unreliable during very early boot in some WebView contexts).
  if (apiBaseUrlCache) return apiBaseUrlCache
  const resolved = getApiBaseUrl()
  if (resolved) apiBaseUrlCache = resolved
  return resolved
}

function resolveUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  // Tolerate callers passing 'api/...' without the leading slash.
  if (url.startsWith('api/')) url = `/${url}`

  const base = getResolvedApiBaseUrl()
  if (base && url.startsWith('/')) return `${base}${url}`
  return url
}

export function apiUrl(pathOrUrl: string): string {
  return resolveUrl(pathOrUrl)
}

let csrfToken: string | null = null

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredAuthState(): { authenticated: boolean; user?: any } | null {
  try {
    const raw = localStorage.getItem(AUTH_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setStoredAuthState(state: { authenticated: boolean; user?: any } | null): void {
  try {
    if (state && state.authenticated) {
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state))
    } else {
      localStorage.removeItem(AUTH_STATE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

function getCookie(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export async function ensureCsrfCookie(): Promise<void> {
  const target = resolveUrl('/api/auth/csrf/')
  let res: Response
  try {
    res = await fetch(target, { credentials: 'include' })
  } catch (e: any) {
    throw new Error(`Network error calling ${target}: ${e?.message ?? 'Failed to fetch'}`)
  }
  if (!res.ok) return

  // Backend returns token in JSON so native apps can send it (cookies are not readable cross-origin).
  try {
    const data = (await res.clone().json()) as any
    const token = data?.csrfToken || data?.csrf_token
    if (typeof token === 'string' && token) csrfToken = token
  } catch {
    // ignore
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  const method = (options.method ?? 'GET').toUpperCase()
  const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  let body = options.body
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.json)
  }

  if (isUnsafe) {
    // Prefer the token returned by /api/auth/csrf/ (works cross-origin in Capacitor).
    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken)
    } else {
      const csrf = getCookie('csrftoken')
      if (csrf) headers.set('X-CSRFToken', csrf)
    }
  }

  // Attach persistent auth token for reliable cross-session auth
  const authToken = getStoredAuthToken()
  if (authToken) {
    headers.set('Authorization', `Token ${authToken}`)
  }

  const target = resolveUrl(url)
  let res: Response
  try {
    res = await fetch(target, {
      ...options,
      headers,
      body,
      credentials: 'include',
    })
  } catch (e: any) {
    throw new Error(`Network error calling ${target}: ${e?.message ?? 'Failed to fetch'}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const err: ApiError = typeof data === 'object' && data ? (data as ApiError) : { detail: String(data) }
    throw Object.assign(new Error(err.detail ?? 'Request failed'), { status: res.status, data: err })
  }

  return data as T
}
