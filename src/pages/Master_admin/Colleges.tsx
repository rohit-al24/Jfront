import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Settings2, Loader2, Building2 } from 'lucide-react'
import { apiFetch } from '../../api'

interface College {
  id: number
  name: string
  code: string
  city: string
  admins: { id: number; username: string; email: string }[]
}

interface CreateForm {
  name: string
  code: string
  city: string
}

export default function Colleges() {
  const navigate = useNavigate()
  const [colleges, setColleges] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>({ name: '', code: '', city: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = (q = query) => {
    setLoading(true)
    apiFetch<{ colleges: College[] }>(`/api/admin/colleges/${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then(d => setColleges(d.colleges))
      .catch(() => setError('Failed to load colleges'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/api/admin/colleges/', { method: 'POST', body: JSON.stringify(form) })
      setShowCreate(false)
      setForm({ name: '', code: '', city: '' })
      load()
    } catch (err: any) {
      setError(err?.detail || 'Failed to create college')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="text-white w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-violet-400" />
          <h1 className="text-2xl font-bold">Colleges</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add College
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search colleges…"
            className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <button type="submit" className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          Search
        </button>
      </form>

      {/* Error */}
      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : colleges.length === 0 ? (
        <div className="text-center py-20 text-white/40">No colleges found</div>
      ) : (
        <div className="space-y-3">
          {colleges.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-white/45 mt-0.5">
                  {c.code}{c.city ? ` · ${c.city}` : ''}
                </div>
                {c.admins.length > 0 && (
                  <div className="text-xs text-violet-300 mt-1">
                    Admins: {c.admins.map(a => a.username).join(', ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/app/master/colleges/${c.id}`)}
                className="flex-none flex items-center gap-1.5 bg-white/8 hover:bg-white/15 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Settings2 className="w-4 h-4" /> Configure
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Create College</h2>
            {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="College name *"
                required
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="College code (e.g. MIT)"
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <input
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="City"
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError('') }}
                  className="flex-1 bg-white/8 hover:bg-white/15 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
