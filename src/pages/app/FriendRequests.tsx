import { useEffect, useState } from 'react'
import { UserCheck, UserX, Users } from 'lucide-react'
import { apiFetch } from '../../api'

type RequestEntry = {
  id: number
  from_user_id: number
  from_username: string
  from_display_username: string | null
  created_at: string
}

export function FriendRequests() {
  const [requests, setRequests] = useState<RequestEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<number | null>(null)

  function load() {
    apiFetch<{ requests: RequestEntry[] }>('/api/social/requests/incoming/')
      .then((r) => { setRequests(r.requests ?? []); setLoading(false) })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function respond(requestId: number, action: 'accept' | 'reject') {
    setProcessing(requestId)
    try {
      await apiFetch('/api/social/requests/respond/', {
        method: 'POST',
        json: { request_id: requestId, action },
      })
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to respond')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a1a] to-[#0d0d0d] p-6 ring-1 ring-violet-500/20 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Users className="h-6 w-6 text-violet-400" />
          <div>
            <h2 className="text-2xl font-black text-white">Friend Requests</h2>
            <p className="text-sm text-white/40">{requests.length} pending</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-red-300 ring-1 ring-red-500/30">{error}</div>}

      {loading && <div className="text-center py-10 text-white/40 text-sm">Loading…</div>}

      {!loading && requests.length === 0 && (
        <div className="rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
          <Users className="mx-auto h-10 w-10 text-white/20 mb-3" />
          <p className="text-white/40 text-sm">No pending friend requests.</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
            <div>
              <p className="font-bold text-white">{r.from_display_username || r.from_username}</p>
              <p className="text-xs text-white/30">@{r.from_username}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => respond(r.id, 'accept')}
                disabled={processing === r.id}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 px-3 py-2 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-600/40 disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" /> Accept
              </button>
              <button
                onClick={() => respond(r.id, 'reject')}
                disabled={processing === r.id}
                className="flex items-center gap-1.5 rounded-xl bg-red-600/20 px-3 py-2 text-sm font-bold text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-600/40 disabled:opacity-50"
              >
                <UserX className="h-4 w-4" /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
