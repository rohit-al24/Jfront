import { useEffect, useState } from 'react'
import { Loader2, UserCheck } from 'lucide-react'
import { apiFetch } from '../../api'

interface Mentee {
  id: number
  username: string
  email: string
  register_number?: string
  department_name?: string
  class_name?: string
}

export default function Mentees() {
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ mentees: Mentee[] }>('/api/admin/staff/mentees/')
      .then(d => setMentees(d.mentees))
      .catch(() => setError('Failed to load mentees'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="text-white w-full">
      <div className="flex items-center gap-3 mb-6">
        <UserCheck className="w-7 h-7 text-violet-400" />
        <h1 className="text-2xl font-bold">My Mentees</h1>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : mentees.length === 0 ? (
        <div className="text-center py-20 text-white/40">No mentees assigned to you yet</div>
      ) : (
        <div className="space-y-3">
          {mentees.map(m => (
            <div key={m.id} className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <div className="font-semibold">{m.username}</div>
              <div className="text-xs text-white/45 mt-0.5">{m.email}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/35">
                {m.register_number && <span>Reg# {m.register_number}</span>}
                {m.department_name && <span>{m.department_name}</span>}
                {m.class_name && <span>Class: {m.class_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
