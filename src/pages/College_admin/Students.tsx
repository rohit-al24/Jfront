import { useEffect, useState } from 'react'
import { Search, Loader2, Users } from 'lucide-react'
import { apiFetch } from '../../api'

interface Department {
  id: number
  dep_name: string
}

interface ClassItem {
  id: number
  name: string
}

interface Student {
  id: number
  username: string
  email: string
  register_number?: string
  department_name?: string
  class_name?: string
  mentor_name?: string
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [deptId, setDeptId] = useState('')
  const [classId, setClassId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ departments: Department[] }>('/api/admin/departments/')
      .then(d => setDepartments(d.departments))
      .catch(() => {})
    apiFetch<{ classes: ClassItem[] }>('/api/admin/classes/')
      .then(d => setClasses(d.classes))
      .catch(() => {})
    loadStudents()
  }, [])

  const loadStudents = (dept = deptId, cls = classId, q = query) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dept) params.set('dept_id', dept)
    if (cls) params.set('class_id', cls)
    if (q) params.set('q', q)
    apiFetch<{ students: Student[] }>(`/api/admin/students/?${params}`)
      .then(d => setStudents(d.students))
      .catch(() => setError('Failed to load students'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="text-white w-full">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-violet-400" />
        <h1 className="text-2xl font-bold">Students</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadStudents()}
            placeholder="Search name / email / reg#…"
            className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <select value={deptId} onChange={e => { setDeptId(e.target.value); loadStudents(e.target.value, classId) }}
          className="bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.dep_name}</option>)}
        </select>
        <select value={classId} onChange={e => { setClassId(e.target.value); loadStudents(deptId, e.target.value) }}
          className="bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => loadStudents()}
          className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          Search
        </button>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 text-white/40">No students found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-left border-b border-white/8">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Reg#</th>
                <th className="pb-3 pr-4 font-medium">Department</th>
                <th className="pb-3 pr-4 font-medium">Class</th>
                <th className="pb-3 font-medium">Mentor</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-white">{s.username}</div>
                    <div className="text-white/40 text-xs">{s.email}</div>
                  </td>
                  <td className="py-3 pr-4 text-white/60">{s.register_number || '—'}</td>
                  <td className="py-3 pr-4 text-white/60">{s.department_name || '—'}</td>
                  <td className="py-3 pr-4 text-white/60">{s.class_name || '—'}</td>
                  <td className="py-3 text-white/60">{s.mentor_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
