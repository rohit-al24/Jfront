import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth'
import { apiFetch } from '../api'
import backgroundVideo from '../assets/background.mp4'

type Level = 'N5' | 'N4'
type Mode = 'login' | 'register' | 'emailOtp' | 'college' | 'otp'

export function MobileWelcome({ initialMode = 'login' }: { initialMode?: Mode } = {}) {
  const { login, register, confirmTotp } = useAuth()
  const navigate = useNavigate()

  const [level, setLevel] = useState<Level>('N5')
  const [mode, setMode] = useState<Mode>(initialMode)
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'employee'>('student')
  const [referralCode, setReferralCode] = useState('')
  const [totp, setTotp] = useState<{ setup_token: string; secret: string; otpauth_url: string } | null>(null)
  const [otp, setOtp] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState<string | null>(null)
  const [collegeQuery, setCollegeQuery] = useState('')
  const [colleges, setColleges] = useState<Array<{ id: number; code?: string | null; name: string }>>([])
  const [collegeId, setCollegeId] = useState<number | undefined>(undefined)
  const [otpRequired, setOtpRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [bgReady, setBgReady] = useState(false)

  useEffect(() => {
    if (mode !== 'college') return
    let mounted = true
    const t = window.setTimeout(() => {
      apiFetch<{ colleges?: Array<{ id: number; code?: string | null; name: string }> }>(
        `/api/colleges/public/?q=${encodeURIComponent(collegeQuery.trim())}`,
      )
        .then((j) => {
          if (!mounted) return
          setColleges(j.colleges || [])
        })
        .catch(() => {
          if (!mounted) return
          setColleges([])
        })
    }, 250)

    return () => {
      mounted = false
      window.clearTimeout(t)
    }
  }, [mode, collegeQuery])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(username, password, otpRequired ? otp : undefined)
      } else if (mode === 'register') {
        const res = await apiFetch<{ sent: boolean; expires_at?: string }>('/api/send-email-otp/', {
          method: 'POST',
          json: { email: email.trim() },
        })
        setEmailOtp('')
        setEmailOtpExpiresAt(res.expires_at ?? null)
        setMode('emailOtp')
        return
      } else if (mode === 'emailOtp') {
        await apiFetch('/api/verify-email-otp/', { method: 'POST', json: { email: email.trim(), otp: emailOtp.trim() } })
        setMode('college')
        return
      } else if (mode === 'college') {
        const res = await register({ username, password, email: email.trim(), first_name: firstName || undefined, last_name: lastName || undefined, target_level: level, referral_code: referralCode || undefined, role, college_id: collegeId })
        if (res.otpSetupRequired) {
          setTotp(res.totp)
          setOtp('')
          setMode('otp')
          return
        }
      }
      navigate('/app/learn')
    } catch (err: any) {
      const code = err?.data?.code
      const detail = err?.data?.detail ?? err?.message

      if (mode === 'login' && code === 'otp_required') {
        setOtpRequired(true)
        setError((detail ?? 'Enter your OTP code').toString())
      } else {
        setError((detail ?? (mode === 'login' ? 'Login failed' : 'Registration failed')).toString())
      }
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!totp) return
    setError(null)
    setBusy(true)
    try {
      await confirmTotp(totp.setup_token, otp)
      navigate('/app/learn')
    } catch (err: any) {
      const detail = err?.data?.detail ?? err?.message ?? 'OTP verification failed'
      setError(detail.toString())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      {/* --- TOP SECTION: VIDEO BACKGROUND (55% height) --- */}
      <div className="relative h-[55vh] w-full overflow-hidden bg-[#050505]">
        {/* Video layer — 70% opacity, fills container with object-cover */}
        <div className="absolute inset-0 bg-black" />
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setBgReady(true)}
          className={['absolute inset-0 h-full w-full object-cover transition-opacity duration-300', bgReady ? 'opacity-70' : 'opacity-0'].join(' ')}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>

        {/* Dark overlay for text contrast (30% black tint) */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Branding badge */}
        <div className="absolute left-0 right-0 top-8 z-10 flex justify-center">
          <div className="rounded-full border border-white/10 bg-black/60 px-6 py-2 text-sm font-black uppercase tracking-widest backdrop-blur-md flex items-baseline gap-1">
            <span
              style={{
                backgroundImage: 'linear-gradient(135deg, #000000 0%, #330000 20%, #800000 40%, #B30000 60%, #E60000 80%, #FFFFFF 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Ben
            </span>
            <span
              style={{
                backgroundImage: 'linear-gradient(180deg, #3D2D0B 0%, #6B4E16 15%, #9C7A28 30%, #CFB04C 45%, #FFFFFF 50%, #CFB04C 55%, #9C7A28 70%, #6B4E16 85%, #3D2D0B 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Go
            </span>
          </div>
        </div>

        {/* Hero text overlay — FOCAL POINT */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-5xl font-black italic leading-none tracking-tighter text-white drop-shadow-2xl">
            Benkyou <br />
            <span className="text-red-600">Nihongo</span>
          </h1>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.4em] text-gray-500">
            JLPT N5 • N4 MASTERY
          </p>
        </div>

        {/* Heavy dark-to-white gradient — blends cinematic video into clean login card */}
        <div className="absolute bottom-0 z-10 h-40 w-full bg-gradient-to-b from-black/0 via-black/80 to-white" />
      </div>

      {/* --- BOTTOM SECTION: AUTH SHEET --- */}
      {/* -mt-10 overlaps the gradient for the slide-up sheet effect */}
      <div className="relative z-20 -mt-10 flex-grow rounded-t-[40px] bg-white px-8 pb-12 pt-8 shadow-[0_-10px_40px_rgba(0,0,0,0.10)]">

        {/* Level selector tabs */}
        <div className="mb-8 flex rounded-2xl bg-gray-100 p-1">
          <button
            onClick={() => setLevel('N5')}
            className={[
              'flex-1 rounded-xl py-3 text-sm font-bold transition-all',
              level === 'N5' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500',
            ].join(' ')}
          >
            N5 Level
          </button>
          <button
            onClick={() => setLevel('N4')}
            className={[
              'flex-1 rounded-xl py-3 text-sm font-bold transition-all',
              level === 'N4' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500',
            ].join(' ')}
          >
            N4 Level
          </button>
        </div>
        <div className="mb-4 flex gap-3">
          <button onClick={() => setRole('student')} className={[ 'flex-1 rounded-xl py-2 text-sm font-bold transition-all', role === 'student' ? 'bg-red-600 text-white' : 'text-gray-500' ].join(' ')}>Student</button>
          <button onClick={() => setRole('employee')} className={[ 'flex-1 rounded-xl py-2 text-sm font-bold transition-all', role === 'employee' ? 'bg-red-600 text-white' : 'text-gray-500' ].join(' ')}>Employee</button>
        </div>

        {/* Login / Register toggle */}
        <div className="mb-6 flex gap-6 border-b border-gray-100 pb-4">
          <button
            onClick={() => { setMode('login'); setError(null); setOtpRequired(false); setOtp(''); setTotp(null); setEmailOtp(''); setEmailOtpExpiresAt(null) }}
            className={[
              'text-sm font-bold transition-colors',
              mode === 'login' ? 'text-gray-900 underline decoration-red-600 underline-offset-4' : 'text-gray-400',
            ].join(' ')}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); setOtpRequired(false); setOtp(''); setTotp(null); setEmailOtp(''); setEmailOtpExpiresAt(null) }}
            className={[
              'text-sm font-bold transition-colors',
              mode === 'register' ? 'text-gray-900 underline decoration-red-600 underline-offset-4' : 'text-gray-400',
            ].join(' ')}
          >
            Sign Up
          </button>
          {mode === 'otp' ? (
            <span className="ml-auto text-xs font-bold uppercase tracking-widest text-gray-400">OTP Setup</span>
          ) : mode === 'emailOtp' ? (
            <span className="ml-auto text-xs font-bold uppercase tracking-widest text-gray-400">Email OTP</span>
          ) : mode === 'college' ? (
            <span className="ml-auto text-xs font-bold uppercase tracking-widest text-gray-400">College</span>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {mode === 'otp' && totp ? (
          <form onSubmit={onConfirmOtp} className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-xs text-gray-600">
              <div className="font-black uppercase tracking-widest text-gray-500">Google Authenticator Key</div>
              <div className="mt-2 font-mono text-sm text-gray-900 break-all">{totp.secret}</div>
            </div>
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0a0a0a] py-4 text-sm font-bold text-white shadow-xl transition-transform active:scale-95 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setTotp(null); setOtp(''); setOtpRequired(false); setError(null) }}
              className="w-full rounded-2xl border border-gray-200 bg-white py-4 text-sm font-bold text-gray-900"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              required
              autoComplete="username"
              placeholder="Username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
            />
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input autoComplete="given-name" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white" />
                  <input autoComplete="family-name" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white" />
                </div>
                <input required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white" />
              </>
            )}

            {mode === 'emailOtp' ? (
              <>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-xs text-gray-600">
                  <div className="font-black uppercase tracking-widest text-gray-500">Email Verification</div>
                  <div className="mt-2 text-sm text-gray-900">OTP sent to {email.trim()}</div>
                  {emailOtpExpiresAt ? <div className="mt-1 text-xs text-gray-500">Expires: {emailOtpExpiresAt}</div> : null}
                </div>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Email OTP (6 digits)"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
                />
              </>
            ) : null}

            {mode === 'college' ? (
              <>
                <input
                  placeholder="Search college"
                  value={collegeQuery}
                  onChange={(e) => setCollegeQuery(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
                />
                <select
                  value={collegeId ?? ''}
                  onChange={(e) => setCollegeId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
                >
                  <option value="">No college</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>{c.code ? `${c.code} - ${c.name}` : c.name}</option>
                  ))}
                </select>
              </>
            ) : null}

            <input
              required
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
            />

            {mode === 'login' && otpRequired ? (
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="OTP (6 digits)"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
              />
            ) : null}

            {/* Referral field only during sign-up */}
            {mode === 'register' && (
              <input
                autoComplete="off"
                placeholder="Referral code (optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:bg-white"
              />
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0a0a0a] py-4 text-sm font-bold text-white shadow-xl transition-transform active:scale-95 disabled:opacity-60"
            >
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? (otpRequired ? 'Verify & Log In' : 'Log In')
                  : mode === 'register'
                    ? 'Send Email OTP'
                    : mode === 'emailOtp'
                      ? 'Verify Email OTP'
                      : mode === 'college'
                        ? `Create Account (${level})`
                        : `Sign Up for ${level}`}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="my-7 flex items-center">
          <hr className="flex-grow border-gray-200" />
          <span className="px-4 text-xs font-bold uppercase tracking-widest text-gray-400">Or continue with</span>
          <hr className="flex-grow border-gray-200" />
        </div>

        {/* Social login (visual — social OAuth not yet wired) */}
        <div className="flex justify-center gap-5">
          <button
            type="button"
            title="Google (coming soon)"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-gray-50 active:scale-95"
          >
            {/* Google colour "G" mark */}
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>

          <button
            type="button"
            title="Facebook (coming soon)"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-gray-50 active:scale-95"
          >
            {/* Facebook "f" */}
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49H13.875V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
          </button>

          <button
            type="button"
            title="Apple (coming soon)"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-gray-50 active:scale-95"
          >
            {/* Apple  */}
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-900" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          </button>
        </div>

        {mode !== 'otp' ? (
          <p className="mt-8 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => { setMode('register'); setError(null); setOtpRequired(false); setOtp(''); setTotp(null) }} className="font-bold text-red-600 underline">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(null); setOtpRequired(false); setOtp(''); setTotp(null) }} className="font-bold text-red-600 underline">
                  Log In
                </button>
              </>
            )}
          </p>
        ) : null}

        {/* Legal footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Starts at only{' '}
          <span className="font-bold text-gray-600">₹200/month</span>
          {' · '}
          <Link to="/" className="underline">
            Learn more
          </Link>
        </p>
      </div>
    </div>
  )
}
