import { Trophy, Crown, Medal, Users } from 'lucide-react'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { apiFetch } from '../../api'

type LeaderboardEntry = {
  rank: number
  name: string
  avatar: string
  level: 'N5' | 'N4' | null
  streak: number
  points_week: number
  points_total: number
  id?: number
  college?: string | null
  profile_picture?: string | null
  display_username?: string | null
}

type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  college_scoped?: boolean
  college_name?: string
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />
  if (rank === 2) return <Medal className="h-6 w-6 text-slate-300" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />
  return <span className="text-base font-black text-white/40">#{rank}</span>
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [collegeName, setCollegeName] = useState<string | null>(null)
  const [collegeScoped, setCollegeScoped] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch<LeaderboardResponse>('/api/leaderboard/')
      .then((res) => {
        setEntries(res.entries ?? [])
        setCollegeScoped(res.college_scoped ?? false)
        setCollegeName(res.college_name ?? null)
      })
      .catch((e: any) => setStatus(e?.message ?? 'Failed to load leaderboard'))
  }, [])

  const top3 = entries.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1000] to-[#0d0d0d] p-6 ring-1 ring-yellow-500/20 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <Trophy className="h-4 w-4" />
            Hall of Honour
          </div>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Weekly Rankings</h2>
          <p className="mt-1 text-base text-white/40">
            {collegeScoped && collegeName
              ? `Showing students from ${collegeName}`
              : 'Top students ranked by XP earned this week.'}
          </p>
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {status}
        </div>
      ) : null}

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {top3.map((e) => (
          <div key={e.rank}
            className={['relative flex flex-col items-center rounded-2xl p-5 ring-1 text-center transition-all',
              e.rank === 1 ? 'bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 ring-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]' :
              e.rank === 2 ? 'bg-gradient-to-b from-slate-400/15 to-slate-400/5 ring-slate-400/20' :
              'bg-gradient-to-b from-amber-700/15 to-amber-700/5 ring-amber-700/20'].join(' ')}>
            <div className="mb-2"><RankBadge rank={e.rank} /></div>
            <div className={['flex h-14 w-14 items-center justify-center rounded-full text-base font-black',
              e.rank === 1 ? 'bg-yellow-500 text-black' : 'bg-white/15 text-white'].join(' ')}>{e.avatar}</div>
            <div className="mt-3 text-sm font-bold text-white leading-tight">{e.name}</div>
            <div className="mt-1 text-xs text-white/40">{e.level}</div>
            <div className={['mt-2 text-xl font-black', e.rank === 1 ? 'text-yellow-400' : 'text-white/80'].join(' ')}>{e.points_week.toLocaleString()}</div>
            <div className="text-xs text-white/30">XP</div>
          </div>
        ))}
      </div>

      {/* Full list */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <h3 className="mb-5 text-lg font-bold uppercase tracking-wider text-white/70">Full Rankings</h3>
        <div className="space-y-2">
          {entries.map((e) => {
            const handle = e.display_username || e.name
            const initial = (e.avatar || handle?.[0] || '?').toUpperCase()
            return (
              <div key={e.rank} className={['flex items-center gap-3 rounded-xl p-3 ring-1 transition-all hover:ring-yellow-500/30',
                e.rank <= 3 ? 'bg-yellow-500/5 ring-yellow-500/15' : 'bg-white/[0.03] ring-white/8'].join(' ')}>
                {/* Rank */}
                <div className="flex h-8 w-8 flex-none items-center justify-center">
                  <RankBadge rank={e.rank} />
                </div>
                {/* Profile pic */}
                <div className={['flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-black overflow-hidden ring-1',
                  e.rank === 1 ? 'ring-yellow-500/40' : 'ring-white/10'].join(' ')}>
                  {e.profile_picture ? (
                    <img src={e.profile_picture} alt={handle} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center ${e.rank === 1 ? 'bg-yellow-500 text-black' : 'bg-white/15 text-white'}`}>
                      {initial}
                    </div>
                  )}
                </div>
                {/* Name + username */}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-bold text-white leading-tight">{e.name}</div>
                  <div className="truncate text-xs text-white/40">@{handle} · {e.level}</div>
                </div>
                {/* XP + view profile */}
                <div className="flex items-center gap-2 flex-none">
                  <div className="text-right">
                    <div className="text-base font-black text-yellow-400">{e.points_week.toLocaleString()}</div>
                    <div className="text-[10px] text-white/30">XP</div>
                  </div>
                  {e.id != null && (
                    <button
                      onClick={() => navigate(`/app/users/${e.id}`)}
                      title="View profile"
                      className="flex items-center justify-center rounded-xl bg-violet-600/20 p-2 text-violet-300 ring-1 ring-violet-500/30 transition hover:bg-violet-600/40"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {!entries.length && !status ? (
          <p className="mt-5 text-center text-sm text-white/20">No rankings yet.</p>
        ) : null}
      </div>
    </div>
  )
}
