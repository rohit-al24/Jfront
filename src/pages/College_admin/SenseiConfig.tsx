import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, GraduationCap, Check } from 'lucide-react'
import { apiFetch } from '../../api'

interface SenseiInfo {
  id: number
  username: string
  email: string
}

interface ClassItem {
  id: number
  name: string
  assigned: boolean
}

export default function SenseiConfig() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [sensei, setSensei] = useState<SenseiInfo | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => {
    setLoading(true)
    apiFetch<{ sensei: SenseiInfo; classes: ClassItem[] }>(`/api/admin/sensei/${userId}/classes/`)
      .then(d => { setSensei(d.sensei); setClasses(d.classes) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [userId])

  const toggle = (id: number) => {
    setClasses(cs => cs.map(c => c.id === id ? { ...c, assigned: !c.assigned } : c))
  }

  const save = async () => {
    setSaving(true); setError('')
    const assigned = classes.filter(c => c.assigned).map(c => c.id)
    try {
      await apiFetch(`/api/admin/sensei/${userId}/classes/`, {
        method: 'POST',
        body: JSON.stringify({ class_ids: assigned }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="text-white w-full max-w-2xl">
      <button onClick={() => navigate('/app/college/sensei')}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Sensei
      </button>

      {sensei && (
        <div className="bg-white/5 border border-white/8 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <GraduationCap className="w-10 h-10 text-violet-400 flex-none" />
          <div>
            <h1 className="text-xl font-bold">{sensei.username}</h1>
            <div className="text-sm text-white/45">{sensei.email}</div>
          </div>
        </div>
      )}

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      <h2 className="text-base font-semibold mb-3 text-white/70">Assigned Classes</h2>
      <p className="text-xs text-white/35 mb-4">Check classes to assign this sensei. Click Save when done.</p>

      {classes.length === 0 ? (
        <div className="text-center py-12 text-white/30">No classes in your college</div>
      ) : (
        <div className="space-y-2 mb-6">
          {classes.map(c => (
            <label key={c.id}
              className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/8 transition-colors">
              <input
                type="checkbox"
                checked={c.assigned}
                onChange={() => toggle(c.id)}
                className="accent-violet-500 w-4 h-4"
              />
              <span className="text-sm font-medium">{c.name}</span>
            </label>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving || classes.length === 0}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5 text-green-300" /> : null}
        {saved ? 'Saved!' : 'Save Assignments'}
      </button>
    </div>
  )
}
