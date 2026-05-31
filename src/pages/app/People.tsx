import { useEffect, useMemo, useState } from 'react'
import { Search, Users, UserPlus, UserCheck, UserX } from 'lucide-react'

import { apiFetch } from '../../api'

type UserSummary = {
  id: number
  username: string
  display_username?: string | null
  full_name?: string
  college?: string | null
  level?: string | null
  streak?: number
  profile_picture?: string | null
  is_friend?: boolean
}

type IncomingRequest = UserSummary & {
  request_id: number
  sent_at: string
}

function avatarLetter(name: string) {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  return (
    <div className="h-11 w-11 rounded-full bg-violet-600/20 flex items-center justify-center overflow-hidden ring-1 ring-violet-500/20">
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-violet-200 font-black">{avatarLetter(name)}</span>
      )}
    </div>
  )
}

export function People() {
  const [friends, setFriends] = useState<UserSummary[]>([])
  const [requests, setRequests] = useState<IncomingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<UserSummary[]>([])

  const [sendingId, setSendingId] = useState<number | null>(null)
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set())
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [friendsRes, reqRes] = await Promise.all([
        apiFetch<{ friends: UserSummary[] }>('/api/social/friends/'),
        apiFetch<{ requests: IncomingRequest[] }>('/api/social/requests/incoming/'),
      ])
      setFriends(friendsRes.friends ?? [])
      setRequests(reqRes.requests ?? [])
    } catch (e: any) {
      setError((e?.data?.detail ?? e?.message ?? 'Failed to load').toString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setResults([])
      return
    }

    const t = setTimeout(() => {
      setSearching(true)
      apiFetch<{ users: UserSummary[] }>(`/api/social/search/?q=${encodeURIComponent(query)}`)
        .then((r) => {
          setResults(r.users ?? [])
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 350)

    return () => clearTimeout(t)
  }, [q])

  const pendingCount = requests.length

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends])

  async function sendRequest(userId: number) {
    setSendingId(userId)
    setError(null)
    try {
      await apiFetch('/api/social/requests/send/', { method: 'POST', json: { to_user_id: userId } })
      setSentRequests((prev) => new Set([...prev, userId]))
    } catch (e: any) {
      setError((e?.data?.detail ?? e?.message ?? 'Failed to send request').toString())
    } finally {
      setSendingId(null)
    }
  }

  async function respond(requestId: number, action: 'accept' | 'reject') {
    setProcessingRequestId(requestId)
    setError(null)
    try {
      await apiFetch('/api/social/requests/respond/', { method: 'POST', json: { request_id: requestId, action } })
      setRequests((prev) => prev.filter((r) => r.request_id !== requestId))
      if (action === 'accept') {
        // Reload friends to include the new friend
        const fr = await apiFetch<{ friends: UserSummary[] }>('/api/social/friends/')
        setFriends(fr.friends ?? [])
      }
    } catch (e: any) {
      setError((e?.data?.detail ?? e?.message ?? 'Failed to respond').toString())
    } finally {
      setProcessingRequestId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a1a] to-[#0d0d0d] p-6 ring-1 ring-violet-500/20 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Users className="h-6 w-6 text-violet-400" />
          <div>
            <h2 className="text-2xl font-black text-white">People</h2>
            <p className="text-sm text-white/40">{pendingCount} pending requests</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-red-300 ring-1 ring-red-500/30">{error}</div>
      ) : null}

      {/* Search */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Search</div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or username…"
            className="w-full rounded-xl bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-violet-500/50"
          />
        </div>
        {searching ? <div className="text-xs text-white/30">Searching…</div> : null}

        {results.length > 0 ? (
          <div className="rounded-xl ring-1 ring-white/10 overflow-hidden">
            {results.map((u) => {
              const name = u.display_username || u.username
              const isFriend = friendIds.has(u.id) || !!u.is_friend
              const alreadySent = sentRequests.has(u.id)
              return (
                <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={name} url={u.profile_picture} />
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">{name}</div>
                      <div className="text-xs text-white/30 truncate">@{u.username}</div>
                      <div className="text-[11px] text-white/25 truncate">
                        {u.college ? `${u.college} · ` : ''}{u.level || ''}{u.streak != null ? ` · ${u.streak} streak` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => sendRequest(u.id)}
                    disabled={isFriend || alreadySent || sendingId === u.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600/20 px-3 py-2 text-xs font-black text-violet-200 ring-1 ring-violet-500/30 transition hover:bg-violet-600/35 disabled:opacity-40"
                    title={isFriend ? 'Already friends' : alreadySent ? 'Request sent' : 'Send request'}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isFriend ? 'Friend' : alreadySent ? 'Sent' : 'Request'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : q.trim().length >= 2 && !searching ? (
          <div className="text-xs text-white/30">No users found.</div>
        ) : null}
      </div>

      {/* Pending requests */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Pending Requests</div>

        {loading ? (
          <div className="text-center py-6 text-sm text-white/40">Loading…</div>
        ) : null}

        {!loading && requests.length === 0 ? (
          <div className="text-sm text-white/30">No pending friend requests.</div>
        ) : null}

        <div className="space-y-2">
          {requests.map((r) => {
            const name = r.display_username || r.username
            return (
              <div key={r.request_id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={name} url={r.profile_picture} />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white truncate">{name}</div>
                    <div className="text-xs text-white/30 truncate">@{r.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(r.request_id, 'accept')}
                    disabled={processingRequestId === r.request_id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/20 px-3 py-2 text-xs font-black text-emerald-200 ring-1 ring-emerald-500/30 transition hover:bg-emerald-600/35 disabled:opacity-40"
                  >
                    <UserCheck className="h-4 w-4" /> Accept
                  </button>
                  <button
                    onClick={() => respond(r.request_id, 'reject')}
                    disabled={processingRequestId === r.request_id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/20 px-3 py-2 text-xs font-black text-red-200 ring-1 ring-red-500/30 transition hover:bg-red-600/35 disabled:opacity-40"
                  >
                    <UserX className="h-4 w-4" /> Decline
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Friends */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Friends</div>

        {!loading && friends.length === 0 ? (
          <div className="text-sm text-white/30">No friends yet.</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {friends.map((f) => {
            const name = f.display_username || f.username
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
                <Avatar name={name} url={f.profile_picture} />
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">{name}</div>
                  <div className="text-xs text-white/30 truncate">@{f.username}</div>
                  <div className="text-[11px] text-white/25 truncate">
                    {f.college ? `${f.college} · ` : ''}{f.level || ''}{f.streak != null ? ` · ${f.streak} streak` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
