import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings2, Loader2, BookOpen, X } from 'lucide-react'
import { apiFetch } from '../../api'

interface ClassItem {
  id: number
  name: string
  sensei_name: string | null
  student_count: number
}

export default function Classes() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    apiFetch<{ classes: ClassItem[] }>('/api/admin/classes/')
      .then(d => setClasses(d.classes))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true); setError('')
    try {
      await apiFetch('/api/admin/classes/', { method: 'POST', body: JSON.stringify({ name }) })
      setShowCreate(false); setName(''); load()
    } catch (err: any) {
      setError(err?.detail || 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="text-white w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-violet-400" />
          <h1 className="text-2xl font-bold">Classes</h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> New Class
        </button>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20 text-white/40">No classes yet</div>
      ) : (
        <div className="space-y-3">
          {classes.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-white/45 mt-0.5">
                  {c.student_count} student{c.student_count !== 1 ? 's' : ''}
                  {c.sensei_name ? ` · Sensei: ${c.sensei_name}` : ''}
                </div>
              </div>
              <button onClick={() => navigate(`/app/college/classes/${c.id}`)}
                className="flex-none flex items-center gap-1.5 bg-white/8 hover:bg-white/15 px-3 py-1.5 rounded-lg text-sm transition-colors">
                <Settings2 className="w-4 h-4" /> Configure
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Create Class</h2>
              <button onClick={() => { setShowCreate(false); setError('') }}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Class name *" required
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setError('') }}
                  className="flex-1 bg-white/8 hover:bg-white/15 py-2.5 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
