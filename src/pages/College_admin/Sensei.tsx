import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings2, Loader2, GraduationCap, X, Search } from 'lucide-react'
import { apiFetch } from '../../api'

interface SenseiUser {
  id: number
  username: string
  email: string
  classes_count?: number
}

interface CollegeUser {
  id: number
  username: string
  email: string
}

export default function Sensei() {
  const navigate = useNavigate()
  const [senseis, setSenseis] = useState<SenseiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<CollegeUser[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    apiFetch<{ senseis: SenseiUser[] }>('/api/admin/sensei/')
      .then(d => setSenseis(d.senseis))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const search = () => {
    if (!query.trim()) return
    setSearching(true)
    apiFetch<{ users: CollegeUser[] }>(`/api/admin/colleges/0/users/?q=${encodeURIComponent(query)}&type=staff`)
      .then(d => setCandidates(d.users))
      .catch(() => setError('Search failed'))
      .finally(() => setSearching(false))
  }

  const addSensei = async (userId: number) => {
    setAdding(userId); setError('')
    try {
      await apiFetch('/api/admin/sensei/', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
      setShowAdd(false); setCandidates([]); setQuery(''); load()
    } catch (err: any) {
      setError(err?.detail || 'Failed to add sensei')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="text-white w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-violet-400" />
          <h1 className="text-2xl font-bold">Sensei</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add Sensei
        </button>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : senseis.length === 0 ? (
        <div className="text-center py-20 text-white/40">No sensei assigned yet</div>
      ) : (
        <div className="space-y-3">
          {senseis.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{s.username}</div>
                <div className="text-xs text-white/45">{s.email}</div>
              </div>
              <button onClick={() => navigate(`/app/college/sensei/${s.id}`)}
                className="flex-none flex items-center gap-1.5 bg-white/8 hover:bg-white/15 px-3 py-1.5 rounded-lg text-sm transition-colors">
                <Settings2 className="w-4 h-4" /> Configure
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Add Sensei</h2>
              <button onClick={() => { setShowAdd(false); setError(''); setCandidates([]) }}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="Search staff by name / email…"
                  className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <button onClick={search}
                className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                Search
              </button>
            </div>
            {searching ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {candidates.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
                    <div>
                      <div className="font-semibold text-sm">{c.username}</div>
                      <div className="text-xs text-white/40">{c.email}</div>
                    </div>
                    <button onClick={() => addSensei(c.id)} disabled={adding === c.id}
                      className="text-violet-400 hover:text-violet-300 text-sm disabled:opacity-50 flex items-center gap-1">
                      {adding === c.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add
                    </button>
                  </div>
                ))}
                {candidates.length === 0 && <div className="text-white/30 text-sm text-center py-4">Search above to find staff</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
