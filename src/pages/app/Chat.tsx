import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Plus, X, Search } from 'lucide-react'
import { apiFetch } from '../../api'

type UserSummary = {
  id: number
  username: string
  display_username?: string | null
  profile_picture?: string | null
}

type Conversation = {
  partner: UserSummary
  last_message: string
  last_message_at: string
  unread_count: number
}

type FriendEntry = UserSummary & { mutual_streak?: number }

function avatarLetter(name: string) {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

export function Chat() {
  const navigate = useNavigate()
  const [convos, setConvos] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [friendSearch, setFriendSearch] = useState('')
  const [friendsLoading, setFriendsLoading] = useState(false)

  useEffect(() => {
    apiFetch<{ conversations: Conversation[] }>('/api/social/conversations/')
      .then((r) => {
        const list = (r.conversations ?? []).slice()
        list.sort((a, b) => {
          const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
          return bt - at
        })
        setConvos(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function openPicker() {
    setPickerOpen(true)
    setFriendSearch('')
    if (friends.length > 0) return
    setFriendsLoading(true)
    try {
      const r = await apiFetch<{ friends: FriendEntry[] }>('/api/social/friends/')
      setFriends(r.friends ?? [])
    } catch {
      // ignore
    } finally {
      setFriendsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a1a] to-[#0d0d0d] p-6 ring-1 ring-violet-500/20 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-violet-400" />
            <h2 className="text-2xl font-black text-white">Messages</h2>
          </div>
          <button
            onClick={openPicker}
            title="New chat"
            className="inline-flex items-center justify-center rounded-xl bg-violet-600/20 p-2 text-violet-200 ring-1 ring-violet-500/30 transition hover:bg-violet-600/35"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Friend picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-5 ring-1 ring-violet-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-black">Start a chat</div>
              <button onClick={() => setPickerOpen(false)} className="text-white/40 hover:text-white transition" title="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Search friends…"
                className="w-full rounded-xl bg-white/5 pl-9 pr-3 py-3 text-sm text-white placeholder-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-violet-500/50"
              />
            </div>

            {friendsLoading ? (
              <div className="text-center py-8 text-sm text-white/40">Loading friends…</div>
            ) : null}

            {!friendsLoading && friends.length === 0 ? (
              <div className="text-center py-8 text-sm text-white/40">No friends yet.</div>
            ) : null}

            <div className="max-h-[55vh] overflow-y-auto rounded-xl ring-1 ring-white/10">
              {friends
                .filter((f) => {
                  const q = friendSearch.trim().toLowerCase()
                  if (!q) return true
                  const name = (f.display_username || f.username).toLowerCase()
                  return name.includes(q) || f.username.toLowerCase().includes(q)
                })
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setPickerOpen(false); navigate(`/app/chat/${f.id}`) }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition border-b border-white/5 last:border-0"
                  >
                    <div className="h-10 w-10 rounded-full bg-violet-600/20 flex items-center justify-center overflow-hidden ring-1 ring-violet-500/20">
                      {f.profile_picture ? (
                        <img src={f.profile_picture} alt={f.display_username || f.username} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-violet-200 font-black">{avatarLetter(f.display_username || f.username)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">{f.display_username || f.username}</div>
                      <div className="text-xs text-white/30 truncate">@{f.username}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-10 text-white/40 text-sm">Loading…</div>}

      {!loading && convos.length === 0 && (
        <div className="rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
          <MessageCircle className="mx-auto h-10 w-10 text-white/20 mb-3" />
          <p className="text-white/40 text-sm">No conversations yet.<br />Tap + to start chatting with a friend.</p>
        </div>
      )}

      <div className="space-y-2">
        {convos.map((c) => (
          <button
            key={c.partner.id}
            onClick={() => navigate(`/app/chat/${c.partner.id}`)}
            className="flex items-center gap-3 w-full rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10 text-left hover:bg-white/[0.06] transition"
          >
            <div className="relative">
              <div className="h-11 w-11 rounded-full bg-violet-600/20 flex items-center justify-center overflow-hidden ring-1 ring-violet-500/20">
                {c.partner.profile_picture ? (
                  <img src={c.partner.profile_picture} alt={c.partner.display_username || c.partner.username} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-violet-200 font-black">{avatarLetter(c.partner.display_username || c.partner.username)}</span>
                )}
              </div>
              {c.unread_count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                  {c.unread_count}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">{c.partner.display_username || c.partner.username}</p>
              <p className="text-xs text-white/30 truncate">{c.last_message}</p>
            </div>
            <span className="text-[10px] text-white/20 shrink-0">
              {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
