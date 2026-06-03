import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, UserPlus, UserMinus, Loader2, Building2, Users } from 'lucide-react'
import { apiFetch } from '../../api'

interface CollegeDetail {
  id: number
  name: string
  code: string
  city: string
}

interface AdminUser {
  id: number
  username: string
  email: string
}

interface CollegeUser {
  id: number
  username: string
  email: string
  type: string
}

export default function CollegeConfig() {
  const { collegeId } = useParams<{ collegeId: string }>()
  const navigate = useNavigate()
  const [college, setCollege] = useState<CollegeDetail | null>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [users, setUsers] = useState<CollegeUser[]>([])
  const [query, setQuery] = useState('')
  const [userType, setUserType] = useState<'student' | 'staff' | ''>('')
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const loadCollege = async () => {
    setLoading(true)
    try {
      const d = await apiFetch<{ college: CollegeDetail; admins: AdminUser[] }>(`/api/admin/colleges/${collegeId}/`)
      setCollege(d.college)
      setAdmins(d.admins)
    } catch {
      setError('Failed to load college')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = (q = query, t = userType) => {
    if (!collegeId) return
    setUsersLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (t) params.set('type', t)
    apiFetch<{ users: CollegeUser[] }>(`/api/admin/colleges/${collegeId}/users/?${params}`)
      .then(d => setUsers(d.users))
      .catch(() => setError('Failed to load users'))
      .finally(() => setUsersLoading(false))
  }

  useEffect(() => { loadCollege() }, [collegeId])
  useEffect(() => { if (collegeId) loadUsers() }, [collegeId])

  const isAdmin = (userId: number) => admins.some(a => a.id === userId)

  const toggleAdmin = async (userId: number) => {
    setActionId(userId)
    setError('')
    try {
      await apiFetch(`/api/admin/colleges/${collegeId}/set-admin/`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, action: isAdmin(userId) ? 'remove' : 'add' }),
      })
      await loadCollege()
    } catch (err: any) {
      setError(err?.detail || 'Action failed')
    } finally {
      setActionId(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="text-white w-full">
      <button
        onClick={() => navigate('/app/master/colleges')}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Colleges
      </button>

      {college && (
        <div className="bg-white/5 border border-white/8 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <Building2 className="w-10 h-10 text-violet-400 flex-none" />
          <div>
            <h1 className="text-xl font-bold">{college.name}</h1>
            <div className="text-sm text-white/45">{college.code}{college.city ? ` · ${college.city}` : ''}</div>
          </div>
        </div>
      )}

      {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

      {/* Current admins */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-3 text-white/70">College Admins ({admins.length})</h2>
        {admins.length === 0 ? (
          <div className="text-white/30 text-sm">No admins assigned</div>
        ) : (
          <div className="space-y-2">
            {admins.map(a => (
              <div key={a.id} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{a.username}</div>
                  <div className="text-xs text-white/40">{a.email}</div>
                </div>
                <button
                  onClick={() => toggleAdmin(a.id)}
                  disabled={actionId === a.id}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors disabled:opacity-50"
                >
                  {actionId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Find users */}
      <div>
        <h2 className="text-base font-semibold mb-3 text-white/70 flex items-center gap-2">
          <Users className="w-4 h-4" /> Find Users
        </h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUsers()}
              placeholder="Search by name / email…"
              className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <select
            value={userType}
            onChange={e => { const v = e.target.value as any; setUserType(v); loadUsers(query, v) }}
            className="bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none"
          >
            <option value="">All types</option>
            <option value="student">Students</option>
            <option value="staff">Staff</option>
          </select>
          <button
            onClick={() => loadUsers()}
            className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Search
          </button>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{u.username}</div>
                  <div className="text-xs text-white/40">{u.email} · {u.type}</div>
                </div>
                <button
                  onClick={() => toggleAdmin(u.id)}
                  disabled={actionId === u.id}
                  className={[
                    'flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50',
                    isAdmin(u.id)
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-violet-400 hover:text-violet-300',
                  ].join(' ')}
                >
                  {actionId === u.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : isAdmin(u.id) ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />
                  }
                  {isAdmin(u.id) ? 'Remove admin' : 'Make admin'}
                </button>
              </div>
            ))}
            {users.length === 0 && !usersLoading && (
              <div className="text-white/30 text-sm">No users found</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
