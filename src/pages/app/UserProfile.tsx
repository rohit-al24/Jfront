import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Users, Star, Trophy, GraduationCap } from 'lucide-react'
import { apiFetch } from '../../api'

type PublicProfile = {
  id: number
  username: string
  display_username: string
  full_name: string
  first_name: string
  college: string | null
  level: string | null
  streak: number
  profile_picture: string | null
  is_friend: boolean
  total_xp: number
}

export function UserProfile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestState, setRequestState] = useState<'idle' | 'sending' | 'sent' | 'friends'>('idle')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    apiFetch<PublicProfile>(`/api/social/profile/${userId}/`)
      .then((p) => {
        setProfile(p)
        if (p.is_friend) setRequestState('friends')
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [userId])

  async function sendRequest() {
    if (!profile) return
    setRequestState('sending')
    try {
      await apiFetch('/api/social/requests/send/', { method: 'POST', json: { to_user_id: profile.id } })
      setRequestState('sent')
    } catch (e: any) {
      const msg = (e?.data?.detail ?? e?.message ?? '').toString()
      // Already friends or already sent — treat as sent
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('friend')) {
        setRequestState('friends')
      } else {
        setRequestState('idle')
        setError(msg)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-yellow-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/60 hover:text-yellow-400 transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base text-red-300 ring-1 ring-red-500/30">
          {error ?? 'User not found'}
        </div>
      </div>
    )
  }

  const initial = (profile.display_username?.[0] ?? profile.username?.[0] ?? '?').toUpperCase()

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Profile card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0d1a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative flex h-24 w-24 flex-none items-center justify-center rounded-2xl overflow-hidden ring-2 ring-white/20">
            {profile.profile_picture ? (
              <img src={profile.profile_picture} alt={profile.display_username} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/40 to-blue-500/30 text-3xl font-black text-white">
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black text-white md:text-3xl">{profile.full_name || profile.display_username}</h1>
            <p className="mt-1 text-sm text-white/50">@{profile.display_username || profile.username}</p>
            {profile.college && (
              <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                <GraduationCap className="h-4 w-4 text-violet-400 flex-none" />
                <span className="text-sm text-violet-300">{profile.college}</span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {profile.level && (
                <span className="rounded-full bg-red-600/20 px-3 py-1 text-sm font-bold text-red-400 ring-1 ring-red-500/30">{profile.level}</span>
              )}
              <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-bold text-yellow-400 ring-1 ring-yellow-500/30">
                {(profile.total_xp ?? 0).toLocaleString()} XP
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-400 ring-1 ring-orange-500/20">
                <Star className="h-3.5 w-3.5" /> {profile.streak} day streak
              </span>
            </div>
          </div>

          {/* Add Friend button */}
          <div className="flex-none">
            {requestState === 'friends' ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-600/20 px-4 py-2.5 text-sm font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                <Users className="h-4 w-4" /> Friends
              </div>
            ) : requestState === 'sent' ? (
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white/50 ring-1 ring-white/10">
                Request Sent
              </div>
            ) : (
              <button
                onClick={() => void sendRequest()}
                disabled={requestState === 'sending'}
                className="flex items-center gap-2 rounded-xl bg-violet-600/20 px-4 py-2.5 text-sm font-bold text-violet-300 ring-1 ring-violet-500/30 transition hover:bg-violet-600/40 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {requestState === 'sending' ? 'Sending…' : 'Add Friend'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Trophy, label: 'Total XP', value: (profile.total_xp ?? 0).toLocaleString(), color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { icon: Star, label: 'Streak', value: `${profile.streak} days`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { icon: GraduationCap, label: 'Level', value: profile.level ?? '—', color: 'text-red-400', bg: 'bg-red-600/10' },
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
    </div>
  )
}
