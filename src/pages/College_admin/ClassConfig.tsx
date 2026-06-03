import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Upload, Download, Loader2, X, Users } from 'lucide-react'
import { apiFetch, apiUrl, getStoredAuthToken } from '../../api'

interface ClassDetail {
  id: number
  name: string
  sensei_id: number | null
  sensei_name: string | null
}

interface Student {
  id: number
  username: string
  email: string
  register_number?: string
}

type AddMode = 'manual' | 'bulk'
type BulkSubType = 'existing' | 'new'

export default function ClassConfig() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [bulkSubType, setBulkSubType] = useState<BulkSubType>('existing')

  const load = () => {
    setLoading(true)
    apiFetch<{ id: number; name: string; sensei_id: number | null; sensei_name: string | null; students: Student[] }>(`/api/admin/classes/${classId}/`)
      .then(d => { setCls({ id: d.id, name: d.name, sensei_id: d.sensei_id, sensei_name: d.sensei_name }); setStudents(d.students) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [classId])

  useEffect(() => {
    if (addMode !== 'manual') return
    setSearchLoading(true)
    setError('')
    apiFetch<{ students: Student[] }>(`/api/admin/students/?q=${encodeURIComponent(searchQ)}`)
      .then(d => setSearchResults(d.students))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false))
  }, [addMode, searchQ])

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const handleManualAssign = async () => {
    if (selectedIds.length === 0) {
      setError('Select at least one student')
      return
    }
    setAdding(true)
    setError('')
    try {
      await apiFetch(`/api/admin/classes/${classId}/assign-students/`, {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedIds }),
      })
      setSelectedIds([])
      setSearchQ('')
      setAddMode(null)
      load()
    } catch (err: any) {
      setError(err?.detail || 'Failed to add students')
    } finally {
      setAdding(false)
    }
  }

  const downloadTemplate = async () => {
    const token = getStoredAuthToken()
    const res = await fetch(apiUrl(`/api/admin/classes/${classId}/bulk-upload/?template=${bulkSubType}`), {
      headers: token ? { Authorization: `Token ${token}` } : {},
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `class_students_${bulkSubType}_template.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setError('')
    const fd = new FormData(); fd.append('file', file)
    fd.append('sub_type', bulkSubType)
    const token = getStoredAuthToken()
    try {
      const res = await fetch(apiUrl(`/api/admin/classes/${classId}/bulk-upload/`), {
        method: 'POST',
        headers: token ? { Authorization: `Token ${token}` } : {},
        body: fd,
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.detail || 'Upload failed') }
      const payload = await res.json().catch(() => null)
      if (payload?.errors?.length) {
        setError(payload.errors.slice(0, 8).join('\n'))
      }
      setAddMode(null); load()
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="text-white w-full">
      <button onClick={() => navigate('/app/college/classes')}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Classes
      </button>

      {cls && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{cls.name}</h1>
          {cls.sensei_name && <div className="text-sm text-white/40 mt-1">Sensei: {cls.sensei_name}</div>}
        </div>
      )}

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3 whitespace-pre-line">{error}</div>}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setAddMode('manual')}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <UserPlus className="w-4 h-4" /> Manual Add
        </button>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 px-4 py-2 rounded-xl text-sm transition-colors">
          <Download className="w-4 h-4" /> Template
        </button>
        <button onClick={() => setAddMode('bulk')}
          className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 px-4 py-2 rounded-xl text-sm transition-colors">
          <Upload className="w-4 h-4" /> Bulk Upload
        </button>
      </div>

      {/* Manual add modal */}
      {addMode === 'manual' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Add Existing Students</h2>
              <button onClick={() => { setAddMode(null); setError(''); setSelectedIds([]); setSearchQ('') }}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            {error && <div className="mb-3 text-red-400 text-sm whitespace-pre-line">{error}</div>}
            <div className="space-y-3">
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name / username / reg no"
                className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
              />

              <div className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-white/[0.03]">
                {searchLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-6 text-sm text-white/40">No results</div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {searchResults.map(u => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => toggleSelected(u.id)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold">{u.username}</div>
                          <div className="text-xs text-white/40">
                            {u.email}
                            {u.register_number ? ` · Reg# ${u.register_number}` : ''}
                          </div>
                        </div>
                        <div className={['h-5 w-5 rounded-md border', selectedIds.includes(u.id) ? 'bg-violet-600 border-violet-500' : 'border-white/20'].join(' ')} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={adding || selectedIds.length === 0}
                onClick={handleManualAssign}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />} Add Selected ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk upload modal */}
      {addMode === 'bulk' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Bulk Upload Students</h2>
              <button onClick={() => { setAddMode(null); setError('') }}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            {error && <div className="mb-3 text-red-400 text-sm whitespace-pre-line">{error}</div>}

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBulkSubType('existing')}
                className={['flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors', bulkSubType === 'existing' ? 'bg-violet-600 border-violet-500' : 'bg-white/5 border-white/10 hover:bg-white/10'].join(' ')}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setBulkSubType('new')}
                className={['flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors', bulkSubType === 'new' ? 'bg-violet-600 border-violet-500' : 'bg-white/5 border-white/10 hover:bg-white/10'].join(' ')}
              >
                New
              </button>
            </div>

            <p className="text-xs text-white/40 mb-4">
              {bulkSubType === 'existing'
                ? 'Upload register_number only.'
                : 'Upload (register_no, name, emailid, department id, password) to create accounts.'}
            </p>

            <button onClick={downloadTemplate}
              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm mb-4 transition-colors">
              <Download className="w-4 h-4" /> Download {bulkSubType} template
            </button>
            {uploading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
            ) : (
              <label className="block w-full cursor-pointer bg-violet-600 hover:bg-violet-500 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors">
                Choose .xlsx file
                <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleBulkUpload} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Students list */}
      <h2 className="text-base font-semibold text-white/70 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" /> Students ({students.length})
      </h2>
      {students.length === 0 ? (
        <div className="text-center py-12 text-white/30">No students in this class</div>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{s.username}</div>
                <div className="text-xs text-white/40">{s.email}{s.register_number ? ` · #${s.register_number}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
