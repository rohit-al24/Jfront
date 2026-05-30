import { Trophy, Crown, Medal, Star, UserPlus } from 'lucide-react'

import { useEffect, useState } from 'react'

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
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set())

  useEffect(() => {
    apiFetch<LeaderboardResponse>('/api/leaderboard/')
      .then((res) => {
        setEntries(res.entries ?? [])
        setCollegeScoped(res.college_scoped ?? false)
        setCollegeName(res.college_name ?? null)
      })
      .catch((e: any) => setStatus(e?.message ?? 'Failed to load leaderboard'))
  }, [])

  async function sendRequest(userId: number) {
    try {
      await apiFetch('/api/social/requests/send/', { method: 'POST', json: { to_user_id: userId } })
      setSentRequests((prev) => new Set([...prev, userId]))
    } catch { /* ignore */ }
  }

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
          {entries.map((e) => (
            <div key={e.rank} className={['flex items-center gap-4 rounded-xl p-4 ring-1 transition-all hover:ring-yellow-500/30',
              e.rank <= 3 ? 'bg-yellow-500/5 ring-yellow-500/15' : 'bg-white/[0.03] ring-white/8'].join(' ')}>
              <div className="flex h-9 w-9 flex-none items-center justify-center">
                <RankBadge rank={e.rank} />
              </div>
              <div className={['flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-black',
                e.rank === 1 ? 'bg-yellow-500 text-black' : 'bg-white/15 text-white'].join(' ')}>{e.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-white">{e.name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-white/40">{e.level}</span>
                  {e.college && <><span className="text-white/20">·</span><span className="text-xs text-violet-400">{e.college}</span></>}
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1 text-xs text-orange-400"><Star className="h-3 w-3" />{e.streak} day streak</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-black text-yellow-400">{e.points_week.toLocaleString()}</div>
                  <div className="text-xs text-white/30">XP</div>
                </div>
                {e.id != null && (
                  <button
                    onClick={() => sendRequest(e.id!)}
                    disabled={sentRequests.has(e.id!)}
                    title="Send friend request"
                    className="flex items-center justify-center rounded-xl bg-violet-600/20 p-2 text-violet-300 ring-1 ring-violet-500/30 transition hover:bg-violet-600/40 disabled:opacity-30"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {!entries.length && !status ? (
          <p className="mt-5 text-center text-sm text-white/20">No rankings yet.</p>
        ) : null}
      </div>
    </div>
  )
}
