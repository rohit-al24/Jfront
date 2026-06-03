import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, Upload, Download, Loader2,
  Users, Briefcase, X,
} from 'lucide-react'
import { apiFetch, apiUrl, getStoredAuthToken } from '../../api'

interface DeptDetail {
  id: number
  dep_name: string
  display_id: number
}

interface Member {
  id: number
  username: string
  email: string
  register_number?: string
  staff_id?: string
}

type Tab = 'staff' | 'students'
type AddMode = 'manual' | 'bulk'
type BulkSubType = 'existing' | 'new'

type StaffSearchItem = Member & { department?: { id: number; name: string } | null }
type StudentSearchItem = Member & { department?: { id: number; name: string } | null }

export default function DeptConfig() {
  const { deptId } = useParams<{ deptId: string }>()
  const navigate = useNavigate()
  const [dept, setDept] = useState<DeptDetail | null>(null)
  const [staff, setStaff] = useState<Member[]>([])
  const [students, setStudents] = useState<Member[]>([])
  const [tab, setTab] = useState<Tab>('staff')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<(StaffSearchItem | StudentSearchItem)[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [bulkSubType, setBulkSubType] = useState<BulkSubType>('existing')

  const load = () => {
    setLoading(true)
    apiFetch<{ id: number; dep_name: string; display_id: number; staff: Member[]; students: Member[] }>(`/api/admin/departments/${deptId}/`)
      .then(d => {
        setDept({ id: d.id, dep_name: d.dep_name, display_id: d.display_id })
        setStaff(d.staff)
        setStudents(d.students)
      })
      .catch(() => setError('Failed to load department'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [deptId])

  useEffect(() => {
    if (addMode !== 'manual') return
    setSearchLoading(true)
    setError('')
    const run = async () => {
      try {
        if (tab === 'staff') {
          const res = await apiFetch<{ staff: StaffSearchItem[] }>(`/api/admin/staff/?q=${encodeURIComponent(searchQ)}`)
          setSearchResults(res.staff)
        } else {
          const res = await apiFetch<{ students: StudentSearchItem[] }>(`/api/admin/students/?q=${encodeURIComponent(searchQ)}`)
          setSearchResults(res.students)
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }
    run()
  }, [addMode, tab, searchQ])

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const handleManualAssign = async () => {
    if (selectedIds.length === 0) {
      setError('Select at least one user')
      return
    }
    setAdding(true)
    setError('')
    try {
      if (tab === 'staff') {
        await apiFetch(`/api/admin/departments/${deptId}/add-staff/`, {
          method: 'POST',
          body: JSON.stringify({ user_ids: selectedIds }),
        })
      } else {
        await apiFetch(`/api/admin/departments/${deptId}/add-students/`, {
          method: 'POST',
          body: JSON.stringify({ user_ids: selectedIds }),
        })
      }
      setSelectedIds([])
      setSearchQ('')
      setAddMode(null)
      load()
    } catch (err: any) {
      setError(err?.detail || 'Failed to assign')
    } finally {
      setAdding(false)
    }
  }

  const downloadTemplate = async () => {
    const templateKey = tab === 'staff'
      ? (bulkSubType === 'existing' ? 'staff_existing' : 'staff_new')
      : (bulkSubType === 'existing' ? 'student_existing' : 'student_new')
    const token = getStoredAuthToken()
    const res = await fetch(apiUrl(`/api/admin/departments/${deptId}/bulk-upload/?template=${templateKey}`), {
      headers: token ? { Authorization: `Token ${token}` } : {},
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${tab}_${bulkSubType}_template.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', tab === 'staff' ? 'staff' : 'student')
    fd.append('sub_type', bulkSubType)
    const token = getStoredAuthToken()
    try {
      const res = await fetch(apiUrl(`/api/admin/departments/${deptId}/bulk-upload/`), {
        method: 'POST',
        headers: token ? { Authorization: `Token ${token}` } : {},
        body: fd,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Upload failed')
      }
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

  const members = tab === 'staff' ? staff : students

  return (
    <div className="text-white w-full">
      <button onClick={() => navigate('/app/college/departments')}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Departments
      </button>

      {dept && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{dept.dep_name}</h1>
          <div className="text-sm text-white/40">Department #{dept.display_id}</div>
        </div>
      )}

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3 whitespace-pre-line">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {(['staff', 'students'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={['px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize',
              tab === t ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'].join(' ')}>
            {t === 'staff' ? <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Staff ({staff.length})</span>
              : <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Students ({students.length})</span>}
          </button>
        ))}
      </div>

      {/* Actions */}
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

      {/* Add modal */}
      {addMode === 'manual' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Add Existing {tab === 'staff' ? 'Staff' : 'Students'}</h2>
              <button onClick={() => { setAddMode(null); setError(''); setSelectedIds([]); setSearchQ('') }}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            {error && <div className="mb-3 text-red-400 text-sm whitespace-pre-line">{error}</div>}
            <div className="space-y-3">
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name / username / ID"
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
                            {u.staff_id ? ` · Staff# ${u.staff_id}` : ''}
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

      {addMode === 'bulk' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Bulk Upload {tab === 'staff' ? 'Staff' : 'Students'}</h2>
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
                ? `Upload ${tab === 'staff' ? 'staff_id' : 'register_number'} only.`
                : 'Upload (id, name, emailid, department id, password) to create accounts.'}
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

      {/* Members list */}
      {members.length === 0 ? (
        <div className="text-center py-16 text-white/30">No {tab} in this department</div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{m.username}</div>
                <div className="text-xs text-white/40">
                  {m.email}
                  {m.register_number && ` · Reg# ${m.register_number}`}
                  {m.staff_id && ` · Staff# ${m.staff_id}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
