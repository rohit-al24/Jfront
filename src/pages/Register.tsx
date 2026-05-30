import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth'
import { apiFetch } from '../api'
import backgroundVideo from '../assets/background.mp4'

export function Register() {
  const { register, state } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (state?.authenticated) {
      navigate('/app/learn')
    }
  }, [state, navigate])

  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'employee'>('student')
  const [stage, setStage] = useState<'details' | 'emailOtp' | 'college'>('details')

  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState<string | null>(null)

  const [collegeQuery, setCollegeQuery] = useState('')
  const [colleges, setColleges] = useState<Array<{ id: number; code?: string | null; name: string }>>([])
  const [collegeId, setCollegeId] = useState<number | undefined>(undefined)
  const [collegesLoading, setCollegesLoading] = useState(false)
  const [targetLevel, setTargetLevel] = useState<'N5' | 'N4'>('N5')
  const [referralCode, setReferralCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [popup, setPopup] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const [bgReady, setBgReady] = useState(false)

  useEffect(() => {
    const target = searchParams.get('target')
    if (target === 'N5' || target === 'N4') setTargetLevel(target)
  }, [searchParams])

  useEffect(() => {
    if (stage !== 'college') return

    let mounted = true
    setCollegesLoading(true)
    const t = window.setTimeout(() => {
      apiFetch<{ colleges?: Array<{ id: number; code?: string | null; name: string }> }>(
        `/api/colleges/public/?q=${encodeURIComponent(collegeQuery.trim())}`,
      )
        .then((j) => {
          if (!mounted) return
          setColleges(j.colleges || [])
          setCollegesLoading(false)
        })
        .catch(() => {
          if (!mounted) return
          setColleges([])
          setCollegesLoading(false)
        })
    }, 250)

    return () => {
      mounted = false
      window.clearTimeout(t)
    }
  }, [stage, collegeQuery])

  async function onSendEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    setPopup(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setPopup({ kind: 'error', message: 'Email required' })
      return
    }

    setBusy(true)
    try {
      const res = await apiFetch<{ sent: boolean; expires_at?: string }>('/api/send-email-otp/', {
        method: 'POST',
        json: { email: trimmedEmail },
      })
      setEmailOtp('')
      setEmailOtpExpiresAt(res.expires_at ?? null)
      setStage('emailOtp')
      setPopup({ kind: 'success', message: 'OTP sent to your email.' })
    } catch (err: any) {
      const detail = (err?.data?.detail ?? err?.message ?? '').toString()
      setPopup({ kind: 'error', message: detail || 'Failed to send OTP' })
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    setPopup(null)
    setBusy(true)
    try {
      await apiFetch('/api/verify-email-otp/', { method: 'POST', json: { email: email.trim(), otp: emailOtp.trim() } })
      setPopup({ kind: 'success', message: 'Email verified.' })
      setStage('college')
    } catch (err: any) {
      const detail = (err?.data?.detail ?? err?.message ?? '').toString()
      setPopup({ kind: 'error', message: detail || 'Invalid OTP' })
    } finally {
      setBusy(false)
    }
  }

  async function onCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    setPopup(null)
    setBusy(true)
    try {
      await register({
        username,
        password,
        email: email.trim(),
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        target_level: targetLevel,
        referral_code: referralCode || undefined,
        role,
        college_id: collegeId,
      })

      setPopup({ kind: 'success', message: 'Account created! Redirecting…' })
      window.setTimeout(() => navigate('/app/learn'), 650)
    } catch (err: any) {
      const status = err?.status
      const detail = (err?.data?.detail ?? err?.message ?? '').toString()
      if (typeof status !== 'number') {
        setPopup({ kind: 'error', message: 'Backend is not reachable. Please start the Django server.' })
      } else {
        setPopup({ kind: 'error', message: detail || 'Registration failed' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-white">

      {/* Toast */}
      {popup && (
        <div className="fixed left-1/2 top-6 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
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

      {/* LEFT PANEL */}
      <div className="relative z-10 flex w-full flex-col justify-center overflow-y-auto bg-[#0a0a0a] px-8 py-12 md:w-[45%] md:px-16 lg:px-20">
        <Link to="/" className="mb-10 inline-flex items-baseline gap-1.5">
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

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Create Account</p>
        <h1 className="text-4xl font-black italic leading-tight text-white md:text-5xl">
          Begin Your<br /><span className="text-red-600">Journey.</span>
        </h1>
        <p className="mt-3 text-sm text-white/40">Choose your JLPT target and start training.</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {(['N5', 'N4'] as const).map((lvl) => (
            <button key={lvl} type="button" onClick={() => setTargetLevel(lvl)}
              className={['rounded-xl py-3 text-sm font-black uppercase tracking-widest ring-1 transition-all duration-200',
                targetLevel === lvl
                  ? 'bg-red-600/25 text-red-400 ring-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.25)]'
                  : 'bg-white/[0.03] text-white/50 ring-white/10 hover:ring-red-500/30 hover:text-white/80'].join(' ')}>
              Target {lvl}
            </button>
          ))}
        </div>

        {/* Role selector */}
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => setRole('student')}
            className={['flex-1 rounded-xl py-2 text-sm font-black uppercase tracking-widest', role === 'student' ? 'bg-yellow-500 text-black' : 'bg-white/[0.03] text-white/50'].join(' ')}>
            Student
          </button>
          <button type="button" onClick={() => setRole('employee')}
            className={['flex-1 rounded-xl py-2 text-sm font-black uppercase tracking-widest', role === 'employee' ? 'bg-yellow-500 text-black' : 'bg-white/[0.03] text-white/50'].join(' ')}>
            Employee
          </button>
        </div>

        {stage === 'details' ? (
        <form onSubmit={onSendEmailOtp} className="mt-5 space-y-4">
          <input required autoComplete="username"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <input autoComplete="given-name"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
              placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input autoComplete="family-name"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
              placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <input required autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <input required type="password" autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <input autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Referral code (optional)" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} />

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/')} className="rounded-xl px-4 py-2 text-sm font-semibold bg-white/[0.02]">Back</button>
            <div className="flex-1" />
            <button disabled={busy}
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all hover:bg-red-500 active:scale-[0.98] disabled:opacity-50">
            {busy
              ? <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending OTP…</span>
              : 'Send Email OTP'}
          </button>
          </div>
        </form>
        ) : null}

        {stage === 'emailOtp' ? (
          <form onSubmit={onVerifyEmailOtp} className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs font-black uppercase tracking-widest text-yellow-500">Email Verification</div>
            <div className="text-sm text-white/60">Enter the OTP sent to <span className="font-semibold text-white">{email.trim()}</span>.</div>
            {emailOtpExpiresAt ? (
              <div className="text-xs text-white/40">Expires at: {emailOtpExpiresAt}</div>
            ) : null}
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit Email OTP"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
            />
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => { setStage('details'); setPopup(null) }} className="flex-1 rounded-xl bg-white/[0.03] px-4 py-3 text-base font-bold text-white/80 ring-1 ring-white/10">
                Back
              </button>
              <button disabled={busy} className="flex-1 rounded-xl bg-yellow-500 px-4 py-3 text-base font-black uppercase tracking-widest text-black disabled:opacity-60">
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>
            </div>
          </form>
        ) : null}

        {stage === 'college' ? (
          <form onSubmit={onCreateAccount} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs font-black uppercase tracking-widest text-yellow-500">College Selection</div>
            <div className="text-sm text-white/60">Type to search, then select from dropdown</div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70">Search by name or code:</label>
              <input
                value={collegeQuery}
                onChange={(e) => setCollegeQuery(e.target.value)}
                placeholder="Type college name or code..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 transition-all focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
              />
              {collegesLoading ? (
                <div className="text-xs text-white/40 flex items-center gap-2">
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Loading colleges...
                </div>
              ) : (
                <div className="text-xs text-white/40">
                  {colleges.length > 0 ? `${colleges.length} college${colleges.length === 1 ? '' : 's'} found` : 'Type to search colleges'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70">Select your college:</label>
              <select
                value={collegeId ?? ''}
                onChange={(e) => {
                  const selectedId = e.target.value ? Number(e.target.value) : undefined
                  setCollegeId(selectedId)
                  // Update search box to show selected college name
                  if (selectedId) {
                    const selectedCollege = colleges.find(c => c.id === selectedId)
                    if (selectedCollege) {
                      setCollegeQuery(selectedCollege.code ? `${selectedCollege.code} - ${selectedCollege.name}` : selectedCollege.name)
                    }
                  } else {
                    setCollegeQuery('')
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20 cursor-pointer"
                size={Math.min(colleges.length + 1, 8)}
              >
                <option value="">── No college / Skip ──</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>{c.code ? `${c.code} - ${c.name}` : c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => { setStage('emailOtp'); setPopup(null) }} className="flex-1 rounded-xl bg-white/[0.03] px-4 py-3 text-base font-bold text-white/80 ring-1 ring-white/10">
                Back
              </button>
              <button disabled={busy} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-base font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] disabled:opacity-60">
                {busy ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-8 space-y-3 text-sm">
          <p className="text-white/40">Already have an account?{' '}
            <Link to="/login" className="font-bold text-red-500 transition-colors hover:text-red-400 hover:underline">Sign in →</Link>
          </p>
          <Link to="/" className="block text-white/30 transition-colors hover:text-white/60">← Back to home</Link>
        </div>
      </div>

      {/* edge shadow */}
      <div className="pointer-events-none absolute left-[45%] top-0 z-20 hidden h-full w-24 -translate-x-1/2 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent md:block" />

      {/* RIGHT PANEL */}
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
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.4em] text-yellow-500/80">JLPT N5 • N4 MASTERY</div>
          <h2 className="text-5xl font-black italic leading-tight text-white drop-shadow-2xl lg:text-6xl">
            MASTER<br /><span className="text-red-600">THE LOOP.</span>
          </h2>
          <p className="mt-5 max-w-xs text-base text-white/50">Train daily. Earn XP. Conquer JLPT with Japan's samurai spirit.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {['N5 Beginner', 'N4 Intermediate', '12-week paths'].map((tag) => (
              <span key={tag} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 backdrop-blur">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile bg */}
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