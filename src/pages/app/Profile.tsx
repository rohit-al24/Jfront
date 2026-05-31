import { useEffect, useRef, useState } from 'react'
import { User, Target, Users, Award, Copy, Check, Download, Pencil, Camera, CheckCircle } from 'lucide-react'

import { apiFetch, apiUrl } from '../../api'
import { useAuth } from '../../auth'
import { CreatureVisualizer } from '../../components/creature/CreatureVisualizer'
import type { CreatureTheme } from '../../components/creature/CreatureVisualizer'
import type { GrowthTheme } from '../../components/GrowthVisualizer'

type PathPayload = {
  level: 'N5' | 'N4'
  completed_weeks: number
  total_weeks: number
  progress_percent: number
}

type ReferralPayload = {
  referral_code: string
  referred_count: number
}

export function Profile() {
  const { state } = useAuth()
  const [path, setPath] = useState<PathPayload | null>(null)
  const [ref, setRef] = useState<ReferralPayload | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Social profile (display_username + profile_picture)
  const [displayUsername, setDisplayUsername] = useState('')
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)
  const picInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetch<PathPayload>('/api/path/').then(setPath).catch(() => null)
    apiFetch<ReferralPayload>('/api/referrals/').then(setRef).catch(() => null)
    apiFetch<{ display_username: string; profile_picture: string | null; bio: string }>('/api/social/profile/')
      .then((p) => {
        setDisplayUsername(p.display_username || state?.user?.username || '')
        setProfilePicUrl(p.profile_picture || null)
      })
      .catch(() => null)
  }, [])

  async function saveDisplayUsername() {
    const val = usernameInput.trim()
    if (!val || val === displayUsername) { setEditingUsername(false); return }
    setSavingUsername(true)
    try {
      const fd = new FormData()
      fd.append('display_username', val)
      const res = await fetch('/api/social/profile/', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Failed to save username')
      }
      const j = await res.json()
      setDisplayUsername(j.display_username || val)
      setEditingUsername(false)
      setStatus('Username updated!')
      setTimeout(() => setStatus(null), 1500)
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to save username')
    } finally {
      setSavingUsername(false)
    }
  }

  async function uploadProfilePic(file: File) {
    setUploadingPic(true)
    try {
      const fd = new FormData()
      fd.append('profile_picture', file)
      const res = await fetch('/api/social/profile/', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Upload failed')
      }
      const j = await res.json()
      setProfilePicUrl(j.profile_picture || null)
      setStatus('Profile picture updated!')
      setTimeout(() => setStatus(null), 1500)
    } catch (e: any) {
      setStatus(e?.message ?? 'Upload failed')
    } finally {
      setUploadingPic(false)
    }
  }

  async function copyCode() {
    const code = ref?.referral_code || state?.user?.referral_code
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setStatus('Referral code copied!')
    setTimeout(() => { setCopied(false); setStatus(null) }, 1500)
  }

  async function downloadCertificate() {
    setStatus(null)
    try {
      const res = await fetch(apiUrl('/api/certificate/'), { credentials: 'include' })
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? ''
        const msg = contentType.includes('application/json') ? (await res.json()).detail : await res.text()
        throw new Error(msg || `Certificate request failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'certificate.pdf'; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to download certificate')
    }
  }

  const pct = path?.progress_percent ?? 0
  const level = path?.level ?? state?.user?.target_level ?? '—'

  const [selectedTheme, setSelectedTheme] = useState<GrowthTheme>(
    (state?.user?.growth_theme as GrowthTheme) ?? 'bodybuilder',
  )
  const [savingTheme, setSavingTheme] = useState(false)

  async function changeTheme(theme: GrowthTheme) {
    if (theme === selectedTheme) return
    setSavingTheme(true)
    setSelectedTheme(theme)
    try {
      await apiFetch('/api/auth/growth-theme/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ growth_theme: theme }),
      })
      setStatus('Growth theme updated!')
      setTimeout(() => setStatus(null), 1500)
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to save theme')
    } finally {
      setSavingTheme(false)
    }
  }

  const THEMES: { key: GrowthTheme; label: string; desc: string; preview: string }[] = [
    { key: 'bodybuilder', label: 'Bodybuilder', desc: '🧍→💪→🏆 Train your vocab muscles', preview: '💪' },
    { key: 'tree',        label: 'Ancient Tree', desc: '🌱→🌳→🌸 Grow a sakura forest',     preview: '🌸' },
    { key: 'city',        label: 'City Builder', desc: '⛺→🏘→✨ Build a neon metropolis',  preview: '🏙' },
  ]

  return (
    <div className="space-y-6">
      {status && (
        <div className={['rounded-2xl px-5 py-4 text-base font-semibold ring-1',
          status.includes('copied') ? 'bg-emerald-950/60 text-emerald-300 ring-emerald-500/30' : 'bg-red-950/60 text-red-300 ring-red-500/30'].join(' ')}>
          {status}
        </div>
      )}

      {/* Profile Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0d1a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Compulsory profile pic banner */}
        {!profilePicUrl && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-950/40 px-4 py-3 text-sm text-orange-300">
            <Camera className="h-4 w-4 flex-none text-orange-400" />
            <span className="flex-1">Set your profile picture — it's required to appear in friends' hints and leaderboard.</span>
            <button
              onClick={() => picInputRef.current?.click()}
              className="rounded-lg bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-300 ring-1 ring-orange-500/40 hover:bg-orange-500/30 transition"
            >
              Upload
            </button>
          </div>
        )}

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar with upload */}
          <div className="relative flex-none">
            <div
              onClick={() => picInputRef.current?.click()}
              className={`group relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-2xl overflow-hidden ring-2 transition-all ${
                profilePicUrl ? 'ring-yellow-500/40 hover:ring-yellow-400/60' : 'ring-orange-500/50 hover:ring-orange-400/70'
              }`}
            >
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-600/40 to-yellow-500/30 text-2xl font-black text-white">
                  {(state?.user?.username?.[0] ?? 'U').toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingPic
                  ? <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <Camera className="h-6 w-6 text-white" />}
              </div>
            </div>
            {profilePicUrl && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-0.5 ring-2 ring-[#0d0d0d]">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            )}
            <input
              ref={picInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadProfilePic(file)
                e.target.value = ''
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
              <User className="h-3.5 w-3.5" /> Student Profile
            </div>
            <h2 className="mt-1 text-3xl font-black text-white">{state?.user?.full_name || state?.user?.username}</h2>

            {/* Editable display username */}
            <div className="mt-1 flex items-center gap-2">
              {editingUsername ? (
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-sm">@</span>
                  <input
                    autoFocus
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') void saveDisplayUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
                    className="rounded-lg border border-yellow-500/40 bg-white/[0.06] px-3 py-1 text-sm text-white outline-none focus:border-yellow-500/70 focus:ring-1 focus:ring-yellow-500/30 w-40"
                    maxLength={30}
                  />
                  <button
                    onClick={() => void saveDisplayUsername()}
                    disabled={savingUsername}
                    className="rounded-lg bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-300 ring-1 ring-yellow-500/30 hover:bg-yellow-500/30 transition disabled:opacity-50"
                  >
                    {savingUsername ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingUsername(false)} className="text-white/30 hover:text-white/60 text-xs">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/50">@{displayUsername || state?.user?.username}</span>
                  <button
                    onClick={() => { setUsernameInput(displayUsername || state?.user?.username || ''); setEditingUsername(true) }}
                    className="rounded-md p-1 text-white/30 hover:text-yellow-400 transition"
                    title="Edit username"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {state?.user?.email && <span className="text-sm text-white/30">• {state.user.email}</span>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-red-600/20 px-3 py-1 text-sm font-bold text-red-400 ring-1 ring-red-500/30">{level}</span>
              <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-bold text-yellow-400 ring-1 ring-yellow-500/30">
                {state?.user?.total_points ?? 0} XP
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-white/50 ring-1 ring-white/10 capitalize">
                {state?.user?.subscription_status ?? 'free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target, label: 'Target Level', value: level, color: 'text-red-400', bg: 'bg-red-600/10' },
          { icon: Award, label: 'Weeks Done', value: `${path?.completed_weeks ?? 0} / ${path?.total_weeks ?? 0}`, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { icon: Users, label: 'Referrals', value: `${ref?.referred_count ?? 0} friends`, color: 'text-purple-400', bg: 'bg-purple-600/10' },
          { icon: User, label: 'Streak', value: `${state?.user?.streak_count ?? 0} days`, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
            <div className={`mb-3 inline-flex rounded-xl ${bg} p-2.5`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="mt-0.5 text-sm text-white/40">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex items-center gap-2 text-base font-bold uppercase tracking-wider text-white/60">
          <Target className="h-5 w-5" /> Learning Progress
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div className="text-5xl font-black text-white">{pct}%</div>
          <div className="text-base text-white/40">{path?.completed_weeks ?? 0} of {path?.total_weeks ?? 0} weeks</div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-yellow-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Referral + Certificate row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Users className="h-5 w-5 text-purple-400" /> Referral Code
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-mono font-bold tracking-widest text-yellow-400">
              {ref?.referral_code ?? state?.user?.referral_code ?? '—'}
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-purple-600 hover:ring-purple-500"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-3 text-sm text-white/40">{ref?.referred_count ?? 0} friends joined via your code</p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Award className="h-5 w-5 text-yellow-400" /> Certificate
          </div>
          <p className="mt-2 text-sm text-white/40">Download your JLPT completion certificate as PDF.</p>
          <button
            onClick={downloadCertificate}
            className="mt-5 flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-base font-black text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] transition hover:bg-yellow-400"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Growth Theme Selector */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-1 text-base font-bold text-white">
          <span className="text-xl">🌱</span> Growth Visualizer Theme
        </div>
        <p className="text-sm text-white/40 mb-5">Choose your Pakka growth avatar style.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map(({ key, label, desc }) => {
            const active = selectedTheme === key
            return (
              <button
                key={key}
                onClick={() => changeTheme(key)}
                disabled={savingTheme}
                className={`flex flex-col items-center gap-3 rounded-xl p-4 ring-1 transition-all text-center
                  ${active
                    ? 'bg-white/10 ring-white/30 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]'}`}
              >
                <CreatureVisualizer theme={key as CreatureTheme} percent={active ? 75 : 40} size="sm" />
                <div>
                  <p className={`font-bold text-sm ${active ? 'text-white' : 'text-white/60'}`}>{label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                </div>
                {active && (
                  <span className="rounded-full bg-emerald-600/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                    Active
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
