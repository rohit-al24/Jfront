import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PhoneCall, Send } from 'lucide-react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

type Message = {
  id: number
  sender_id: number
  content: string
  created_at: string
  is_read: boolean
}

type PartnerInfo = {
  id: number
  username: string
  display_username: string | null
}

type Features = {
  audio_calls_enabled: boolean
}

export function ChatRoom() {
  const { partnerId } = useParams<{ partnerId: string }>()
  const navigate = useNavigate()
  const { state } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function load() {
    if (!partnerId) return
    apiFetch<{ messages: Message[]; partner: PartnerInfo }>(`/api/social/chat/${partnerId}/`)
      .then((r) => {
        setMessages(r.messages ?? [])
        setPartner(r.partner)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .catch(() => null)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000) // poll every 5s
    return () => clearInterval(interval)
  }, [partnerId])

  useEffect(() => {
    apiFetch<Features>('/api/social/features/')
      .then((r) => setAudioEnabled(!!r.audio_calls_enabled))
      .catch(() => setAudioEnabled(false))
  }, [])

  async function sendMessage() {
    if (!input.trim() || !partnerId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      const msg = await apiFetch<Message>(`/api/social/chat/${partnerId}/`, {
        method: 'POST',
        json: { content },
      })
      setMessages((prev) => [...prev, msg])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  const myId = state?.user?.id

  function startAudioCall() {
    if (!audioEnabled) return
    const pid = Number(partnerId)
    if (!myId || !pid || Number.isNaN(pid)) return
    const lo = Math.min(myId, pid)
    const hi = Math.max(myId, pid)
    const room = `bengo-${lo}-${hi}`
    const base = ((import.meta as any)?.env?.VITE_AUDIO_CALL_BASE_URL as string | undefined) || 'https://meet.jit.si'
    const url = `${base.replace(/\/+$/, '')}/${encodeURIComponent(room)}#config.startWithVideoMuted=true&config.prejoinPageEnabled=false`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col h-[80vh] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 mb-4 shrink-0">
        <button onClick={() => navigate('/app/chat')} className="text-white/40 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-9 w-9 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-300 font-bold text-sm">
          {partner ? (partner.display_username || partner.username)[0].toUpperCase() : '?'}
        </div>
        <div>
          <p className="font-bold text-white text-sm">{partner?.display_username || partner?.username || '…'}</p>
          <p className="text-xs text-white/30">@{partner?.username}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {audioEnabled ? (
            <button
              onClick={startAudioCall}
              title="Audio call"
              className="inline-flex items-center justify-center rounded-xl bg-violet-600/20 p-2 text-violet-200 ring-1 ring-violet-500/30 transition hover:bg-violet-600/35"
            >
              <PhoneCall className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-2">
        {messages.map((m) => {
          const isMe = m.sender_id === myId
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-violet-600 text-white' : 'bg-white/10 text-white'}`}>
                <p>{m.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-violet-200' : 'text-white/30'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Type a message…"
          className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-violet-500/50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center rounded-xl bg-violet-600 px-4 text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
