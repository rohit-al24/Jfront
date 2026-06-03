import { useEffect, useState } from 'react'
import { Check, X, Loader2, ClipboardList } from 'lucide-react'
import { apiFetch } from '../../api'

interface ChangeRequest {
  id: number
  student_username: string
  student_email: string
  requested_mentor_username: string | null
  reason: string
  status: string
  created_at: string
}

type Filter = 'pending' | 'approved' | 'rejected' | ''

export default function Requests() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = (f = filter) => {
    setLoading(true)
    const params = f ? `?status=${f}` : ''
    apiFetch<{ requests: ChangeRequest[] }>(`/api/admin/requests/${params}`)
      .then(d => setRequests(d.requests))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const respond = async (id: number, action: 'approve' | 'reject') => {
    setActionId(id); setError('')
    try {
      await apiFetch(`/api/admin/requests/${id}/respond/`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      load()
    } catch (err: any) {
      setError(err?.detail || 'Action failed')
    } finally {
      setActionId(null)
    }
  }

  const filterLabels: { value: Filter; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: '', label: 'All' },
  ]

  return (
    <div className="text-white w-full">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-7 h-7 text-violet-400" />
        <h1 className="text-2xl font-bold">Mentor Change Requests</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit flex-wrap">
        {filterLabels.map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); load(f.value) }}
            className={['px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              filter === f.value ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'].join(' ')}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-white/40">No requests</div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold">{r.student_username}</div>
                  <div className="text-xs text-white/40 mb-2">{r.student_email}</div>
                  <div className="text-sm text-white/70">
                    Requesting mentor:{' '}
                    <span className="text-violet-300">{r.requested_mentor_username || 'Unassign'}</span>
                  </div>
                  {r.reason && (
                    <div className="text-xs text-white/45 mt-1 italic">"{r.reason}"</div>
                  )}
                  <div className="text-xs text-white/25 mt-2">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex-none">
                  {r.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => respond(r.id, 'approve')} disabled={actionId === r.id}
                        className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                        {actionId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button onClick={() => respond(r.id, 'reject')} disabled={actionId === r.id}
                        className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                        {actionId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className={['px-3 py-1 rounded-lg text-xs font-semibold',
                      r.status === 'approved' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'].join(' ')}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
