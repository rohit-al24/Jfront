import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth'
import backgroundVideo from '../assets/background.mp4'

export function Login() {
  const { login, state } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any

  const [bgReady, setBgReady] = useState(false)

  useEffect(() => {
    if (state?.authenticated) {
      navigate(location?.state?.from ?? '/app/learn')
    }
  }, [state, navigate, location])

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [popup, setPopup] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  function toMessage(err: any): { kind: 'error'; message: string } {
    const status = err?.status
    const code = err?.data?.code
    const detail = (err?.data?.detail ?? err?.message ?? '').toString()
    if (typeof status !== 'number') {
      return { kind: 'error', message: 'Backend is not reachable. Please start the Django server.' }
    }
    if (status === 400 && code === 'otp_required') {
      return { kind: 'error', message: detail || 'OTP required. Enter your 6-digit code.' }
    }
    if (status === 400 && detail.toLowerCase().includes('invalid credentials')) {
      return { kind: 'error', message: 'Invalid username/email or password.' }
    }
    return { kind: 'error', message: detail || 'Login failed' }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPopup(null)
    setBusy(true)
    try {
      await login(identifier, password, otpRequired ? otp : undefined)
      setPopup({ kind: 'success', message: 'Login successful! Redirecting…' })
      window.setTimeout(() => navigate(location?.state?.from ?? '/app/learn'), 650)
    } catch (err: any) {
      if (err?.data?.code === 'otp_required') {
        setOtpRequired(true)
      }
      setPopup(toMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-white">

      {/* ── Toast ── */}
      {popup && (
        <div className="fixed left-1/2 top-6 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-[fadeDown_0.25s_ease]">
          <div className={['flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-2xl backdrop-blur-xl',
            popup.kind === 'success' ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200' : 'border-red-500/30 bg-red-950/80 text-red-200'].join(' ')}
            role="status" aria-live="polite">
            {popup.kind === 'success'
              ? <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>}
            <span className="flex-1">{popup.message}</span>
            <button onClick={() => setPopup(null)} className="ml-1 rounded-md p-1 opacity-60 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      {/* ══════════════ LEFT PANEL — Form ══════════════ */}
      <div className="relative z-10 flex w-full flex-col justify-center bg-[#0a0a0a] px-8 py-12 md:w-[45%] md:px-16 lg:px-20">
        {/* Top branding */}
        <Link to="/" className="mb-12 inline-flex items-baseline gap-1.5">
          <span
            className="text-xl font-black uppercase italic tracking-tight"
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
            className="text-xl font-black uppercase italic tracking-tight"
            style={{
              backgroundImage: 'linear-gradient(180deg, #3D2D0B 0%, #6B4E16 15%, #9C7A28 30%, #CFB04C 45%, #FFFFFF 50%, #CFB04C 55%, #9C7A28 70%, #6B4E16 85%, #3D2D0B 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Go
          </span>
        </Link>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Welcome Back</p>
        <h1 className="text-4xl font-black italic leading-tight text-white md:text-5xl">
          Sign In to<br /><span className="text-red-600">Your Dojo.</span>
        </h1>
        <p className="mt-3 text-sm text-white/40">Continue your JLPT mastery journey.</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          <div className="group relative">
            <input
              required
              autoComplete="username"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all duration-200 focus:border-yellow-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-yellow-500/20"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="relative">
            <input
              required
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all duration-200 focus:border-yellow-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-yellow-500/20"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {otpRequired ? (
            <div className="relative">
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all duration-200 focus:border-yellow-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-yellow-500/20"
                placeholder="OTP (6 digits)"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          ) : null}
          <button
            disabled={busy}
            className="group relative w-full overflow-hidden rounded-xl bg-red-600 py-3.5 text-base font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all duration-300 hover:bg-red-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                Signing in…
              </span>
            ) : 'Login'}
          </button>
        </form>

        <div className="mt-8 space-y-3 text-sm">
          <p className="text-white/40">
            No account?{' '}
            <Link to="/register" className="font-bold text-red-500 transition-colors hover:text-red-400 hover:underline">Create one →</Link>
          </p>
          <Link to="/" className="block text-white/30 transition-colors hover:text-white/60">← Back to home</Link>
        </div>
      </div>

      {/* ── vertical edge shadow ── */}
      <div className="pointer-events-none absolute left-[45%] top-0 z-20 hidden h-full w-24 -translate-x-1/2 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent md:block" />

      {/* ══════════════ RIGHT PANEL — Video + Branding ══════════════ */}
      <div className="relative hidden flex-1 md:flex">
        <div className="absolute inset-0 bg-black" />
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setBgReady(true)}
          className={['absolute inset-0 h-full w-full object-cover transition-opacity duration-300', bgReady ? 'opacity-100' : 'opacity-0'].join(' ')}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        {/* dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* left fade into form panel */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
        {/* top/bottom readability gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

        {/* Centred branding on video */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.4em] text-yellow-500/80">JLPT N5 • N4 MASTERY</div>
          <h2 className="text-5xl font-black italic leading-tight text-white drop-shadow-2xl lg:text-6xl">
            Benkyou<br /><span className="text-red-600">Nihongo</span>
          </h2>
          <p className="mt-5 max-w-xs text-base text-white/50">
            Train daily. Earn XP. Conquer JLPT with Japan's samurai spirit.
          </p>
          <div className="mt-8 flex items-center gap-4">
            {['N5 Beginner', 'N4 Intermediate', '12-week paths'].map((tag) => (
              <span key={tag} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 backdrop-blur">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: full-screen video bg */}
      <div className="fixed inset-0 -z-10 md:hidden">
        <div className="absolute inset-0 bg-black" />
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setBgReady(true)}
          className={['h-full w-full object-cover transition-opacity duration-300', bgReady ? 'opacity-30' : 'opacity-0'].join(' ')}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#0a0a0a]/70" />
      </div>
    </div>
  )
}
