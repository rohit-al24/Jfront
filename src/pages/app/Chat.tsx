import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Search } from 'lucide-react'
import { apiFetch } from '../../api'

type Conversation = {
  partner_id: number
  partner_username: string
  partner_display: string | null
  last_message: string
  last_time: string
  unread: number
}

export function Chat() {
  const navigate = useNavigate()
  const [convos, setConvos] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; display_username: string | null }[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    apiFetch<{ conversations: Conversation[] }>('/api/social/conversations/')
      .then((r) => { setConvos(r.conversations ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(() => {
      setSearching(true)
      apiFetch<{ users: any[] }>(`/api/social/search/?q=${encodeURIComponent(search)}`)
        .then((r) => { setSearchResults(r.users ?? []); setSearching(false) })
        .catch(() => setSearching(false))
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a1a] to-[#0d0d0d] p-6 ring-1 ring-violet-500/20 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-violet-400" />
          <h2 className="text-2xl font-black text-white">Messages</h2>
        </div>
      </div>

      {/* Search bar to start new conversation */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users to message…"
          className="w-full rounded-xl bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-violet-500/50"
        />
      </div>

      {searching && <p className="text-xs text-white/30 text-center">Searching…</p>}

      {searchResults.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => { setSearch(''); navigate(`/app/chat/${u.id}`) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition border-b border-white/5 last:border-0"
            >
              <div className="h-9 w-9 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-300 font-bold text-sm">
                {(u.display_username || u.username)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{u.display_username || u.username}</p>
                <p className="text-xs text-white/30">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-center py-10 text-white/40 text-sm">Loading…</div>}

      {!loading && convos.length === 0 && searchResults.length === 0 && !search && (
        <div className="rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
          <MessageCircle className="mx-auto h-10 w-10 text-white/20 mb-3" />
          <p className="text-white/40 text-sm">No conversations yet.<br />Search for a user to start chatting.</p>
        </div>
      )}

      <div className="space-y-2">
        {convos.map((c) => (
          <button
            key={c.partner_id}
            onClick={() => navigate(`/app/chat/${c.partner_id}`)}
            className="flex items-center gap-3 w-full rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10 text-left hover:bg-white/[0.06] transition"
          >
            <div className="relative">
              <div className="h-11 w-11 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-300 font-bold">
                {(c.partner_display || c.partner_username)[0].toUpperCase()}
              </div>
              {c.unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                  {c.unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">{c.partner_display || c.partner_username}</p>
              <p className="text-xs text-white/30 truncate">{c.last_message}</p>
            </div>
            <span className="text-[10px] text-white/20 shrink-0">
              {c.last_time ? new Date(c.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
