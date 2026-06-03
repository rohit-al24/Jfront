import { useEffect, useState } from 'react'
import { Loader2, UserCog, Send } from 'lucide-react'
import { apiFetch } from '../../api'

interface MentorInfo {
  id: number
  username: string
  email: string
  staff_id?: string
}

interface StaffOption {
  id: number
  username: string
  email: string
}

export default function MentorProfile() {
  const [mentor, setMentor] = useState<MentorInfo | null>(null)
  const [available, setAvailable] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [reason, setReason] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showRequest, setShowRequest] = useState(false)

  useEffect(() => {
    apiFetch<{ mentor: MentorInfo | null; available_staff: StaffOption[] }>('/api/admin/student/mentor/')
      .then(d => { setMentor(d.mentor); setAvailable(d.available_staff) })
      .catch(() => setError('Failed to load mentor info'))
      .finally(() => setLoading(false))
  }, [])

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequesting(true); setError(''); setSuccess('')
    try {
      await apiFetch('/api/admin/student/mentor/change-request/', {
        method: 'POST',
        body: JSON.stringify({
          requested_mentor_id: selectedId || null,
          reason,
        }),
      })
      setSuccess('Change request submitted! An admin will review it.')
      setShowRequest(false)
      setSelectedId(''); setReason('')
    } catch (err: any) {
      setError(err?.detail || 'Failed to submit request')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="text-white w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <UserCog className="w-7 h-7 text-violet-400" />
        <h1 className="text-2xl font-bold">My Mentor</h1>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}
      {success && <div className="mb-4 text-green-400 text-sm bg-green-500/10 rounded-xl p-3">{success}</div>}

      {mentor ? (
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 mb-6">
          <div className="text-xs text-white/40 mb-1 uppercase tracking-wide">Assigned Mentor</div>
          <div className="text-xl font-bold">{mentor.username}</div>
          <div className="text-sm text-white/45">{mentor.email}</div>
          {mentor.staff_id && <div className="text-xs text-white/30 mt-1">Staff# {mentor.staff_id}</div>}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 mb-6 text-center text-white/40">
          No mentor assigned yet
        </div>
      )}

      <button
        onClick={() => setShowRequest(true)}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        <Send className="w-4 h-4" /> Request Mentor Change
      </button>

      {showRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Request Mentor Change</h2>
            {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
            <form onSubmit={submitRequest} className="space-y-3">
              <div>
                <label className="text-xs text-white/40 block mb-1">Preferred Mentor (optional)</label>
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                  className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
                  <option value="">No preference</option>
                  {available.map(s => (
                    <option key={s.id} value={s.id}>{s.username} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Why are you requesting a change?"
                  className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowRequest(false); setError('') }}
                  className="flex-1 bg-white/8 hover:bg-white/15 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={requesting}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {requesting && <Loader2 className="w-4 h-4 animate-spin" />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
