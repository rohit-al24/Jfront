import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings2, Loader2, LayoutGrid } from 'lucide-react'
import { apiFetch } from '../../api'

interface Department {
  id: number
  display_id: number
  dep_name: string
  college: number
}

export default function Department() {
  const navigate = useNavigate()
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ dep_name: '', display_id: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    apiFetch<{ departments: Department[] }>('/api/admin/departments/')
      .then(d => setDepts(d.departments))
      .catch(() => setError('Failed to load departments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/api/admin/departments/', {
        method: 'POST',
        body: JSON.stringify({ dep_name: form.dep_name, display_id: Number(form.display_id) || undefined }),
      })
      setShowCreate(false)
      setForm({ dep_name: '', display_id: '' })
      load()
    } catch (err: any) {
      setError(err?.detail || 'Failed to create department')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="text-white w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-7 h-7 text-violet-400" />
          <h1 className="text-2xl font-bold">Departments</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> New Department
        </button>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : depts.length === 0 ? (
        <div className="text-center py-20 text-white/40">No departments yet</div>
      ) : (
        <div className="space-y-3">
          {depts.map(d => (
            <div key={d.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{d.dep_name}</div>
                <div className="text-xs text-white/45 mt-0.5">ID #{d.display_id}</div>
              </div>
              <button
                onClick={() => navigate(`/app/college/departments/${d.id}`)}
                className="flex-none flex items-center gap-1.5 bg-white/8 hover:bg-white/15 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Settings2 className="w-4 h-4" /> Configure
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Create Department</h2>
            {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={form.dep_name}
                onChange={e => setForm(f => ({ ...f, dep_name: e.target.value }))}
                placeholder="Department name *"
                required
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <input
                type="number"
                value={form.display_id}
                onChange={e => setForm(f => ({ ...f, display_id: e.target.value }))}
                placeholder="Display ID (optional)"
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setError('') }}
                  className="flex-1 bg-white/8 hover:bg-white/15 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
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
