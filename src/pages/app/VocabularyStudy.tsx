import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronLeft, Volume2, Lightbulb, X, Save, Pencil } from 'lucide-react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import { saveUnitProgress } from '../../hooks/useUnitProgress'

function speakJa(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    // ignore
  }
}

function SpeakButton({ text }: { text: string }) {
  const [active, setActive] = useState(false)
  function handleClick() {
    speakJa(text)
    setActive(true)
    setTimeout(() => setActive(false), 800)
  }
  return (
    <button
      onClick={handleClick}
      title="Listen"
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 transition-all duration-200 ${
        active
          ? 'bg-yellow-500/25 ring-yellow-400/60 text-yellow-300 scale-110'
          : 'bg-white/[0.05] ring-white/10 text-white/40 hover:bg-yellow-500/15 hover:ring-yellow-400/40 hover:text-yellow-300 hover:scale-105'
      }`}
    >
      <Volume2 className="h-4 w-4" />
    </button>
  )
}

type FriendHint = {
  user_id: number
  display_name: string
  profile_picture?: string | null
}

type VocabItem = {
  id: number
  target: string
  correct: string
  my_hint: string | null
  friends_hints: FriendHint[]
}

type UnitInfo = {
  id: number
  unit_number: number
  name: string
  level: string
}

type FriendHintDetail = {
  user_id: number
  display_name: string
  hint_text: string
  profile_picture?: string | null
}

type HintDetails = {
  my_hint: {
    hint_text: string | null
    has_hint: boolean
    display_name?: string
    profile_picture?: string | null
    updated_at?: string | null
  }
  friends_hints: FriendHintDetail[]
}

export function VocabularyStudy() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const [unit, setUnit] = useState<UnitInfo | null>(null)
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Hint UI state
  const [openHintId, setOpenHintId] = useState<number | null>(null)
  const [hintInputs, setHintInputs] = useState<Record<number, string>>({})
  const [hintSaving, setHintSaving] = useState<number | null>(null)
  const [hintDetails, setHintDetails] = useState<Record<number, HintDetails | undefined>>({})
  const [hintLoading, setHintLoading] = useState<number | null>(null)
  const [hintError, setHintError] = useState<Record<number, string | undefined>>({})
  const [hintEditing, setHintEditing] = useState<Record<number, boolean | undefined>>({})

  // Floating avatar tooltip (positioned near clicked avatar)
  type FloatingPopup = { vocabId: number; userKey: string; isMe: boolean; name: string; top: number; left: number; pic?: string | null }
  const [floatingPopup, setFloatingPopup] = useState<FloatingPopup | null>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Overflow popup for +N click
  const [overflowPopup, setOverflowPopup] = useState<{ vocabId: number } | null>(null)

  useEffect(() => {
    if (!unitId) return
    apiFetch<{ unit: UnitInfo; vocabulary: VocabItem[] }>(`/api/course/unit/${unitId}/vocabulary/study/`)
      .then((r) => {
        setUnit(r.unit)
        setVocabulary(r.vocabulary)
        // Pre-populate hint inputs from server data
        const initial: Record<number, string> = {}
        r.vocabulary.forEach((v) => { if (v.my_hint) initial[v.id] = v.my_hint })
        setHintInputs(initial)
        if (r.vocabulary.length > 0) saveUnitProgress(unitId, { vocabStudied: true })
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load vocabulary'))
  }, [unitId])

  async function loadHintDetails(vocabId: number) {
    setHintLoading(vocabId)
    setHintError((prev) => ({ ...prev, [vocabId]: undefined }))
    try {
      const data = await apiFetch<HintDetails>(`/api/hints/vocab/${vocabId}/`)
      setHintDetails((prev) => ({ ...prev, [vocabId]: data }))
      const text = (data?.my_hint?.hint_text ?? '').toString()
      setHintInputs((prev) => ({ ...prev, [vocabId]: text }))
    } catch (e: any) {
      const msg = (e?.data?.detail ?? e?.message ?? 'Failed to load hint').toString()
      setHintError((prev) => ({ ...prev, [vocabId]: msg }))
    } finally {
      setHintLoading(null)
    }
  }

  function openAvatarPopup(e: React.MouseEvent, vocabId: number, userKey: string, isMe: boolean, name: string, pic?: string | null) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const FLOATER_H = 80
    // Position ABOVE the avatar — overlap by 2px so there is no gap for the cursor to fall through
    const top = Math.max(rect.top - FLOATER_H + 2, 8)
    // Right-align floater with the right edge of the avatar
    const left = Math.min(Math.max(rect.right - 208, 8), window.innerWidth - 216)
    setFloatingPopup({ vocabId, userKey, isMe, name, top, left, pic })
    if (!hintDetails[vocabId]) void loadHintDetails(vocabId)
  }

  function scheduleClosePopup(delay = 220) {
    hoverTimer.current = setTimeout(() => setFloatingPopup(null), delay)
  }
  function cancelClosePopup() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  function openOverflowPopup(vocabId: number) {
    setOverflowPopup({ vocabId })
    if (!hintDetails[vocabId]) void loadHintDetails(vocabId)
  }

  function toggleHint(vocabId: number) {
    if (openHintId === vocabId) {
      setOpenHintId(null)
      return
    }
    setOpenHintId(vocabId)
    setHintEditing((prev) => ({ ...prev, [vocabId]: false }))
    void loadHintDetails(vocabId)
  }

  async function saveHint(vocabId: number) {
    const text = (hintInputs[vocabId] ?? '').trim()
    setHintSaving(vocabId)
    try {
      await apiFetch(`/api/hints/vocab/${vocabId}/`, {
        method: 'POST',
        json: { hint_text: text },
      })
      setVocabulary((prev) =>
        prev.map((v) => v.id === vocabId ? { ...v, my_hint: text || null } : v)
      )
      await loadHintDetails(vocabId)
      setHintEditing((prev) => ({ ...prev, [vocabId]: false }))
    } catch (e: any) {
      const msg = (e?.data?.detail ?? e?.message ?? 'Failed to save hint').toString()
      setHintError((prev) => ({ ...prev, [vocabId]: msg }))
    } finally {
      setHintSaving(null)
    }
  }

  // Resolve profile picture for the open popup (hintDetails when loaded, fall back to pic from vocab list)
  const popupPic = (() => {
    if (!floatingPopup) return null
    const d = hintDetails[floatingPopup.vocabId]
    if (d) {
      if (floatingPopup.isMe) return d.my_hint?.profile_picture ?? null
      const fh = d.friends_hints.find((f) => String(f.user_id) === floatingPopup.userKey)
      return fh?.profile_picture ?? null
    }
    return floatingPopup.pic ?? null
  })()

  // All hinters for overflow popup
  const overflowHinters = (() => {
    if (!overflowPopup) return []
    const item = vocabulary.find((v) => v.id === overflowPopup.vocabId)
    if (!item) return []
    const all: { key: string; name: string; isMe: boolean; pic?: string | null }[] = [
      ...(item.my_hint ? [{ key: 'me', name: authState?.user?.username || 'You', isMe: true, pic: null as string | null }] : []),
      ...item.friends_hints.map((fh) => ({ key: String(fh.user_id), name: fh.display_name, isMe: false, pic: fh.profile_picture ?? null })),
    ]
    return all.slice(3) // only hidden ones
  })()

  return (
    <div className="space-y-6">
      {/* Floating avatar tooltip — no backdrop, anchored above clicked avatar */}
      {floatingPopup && (
        <div
          ref={floatRef}
          className="fixed z-50 w-52 animate-[popIn_0.15s_ease-out] overflow-hidden rounded-2xl border border-white/10 bg-[#141418] shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
          style={{ top: floatingPopup.top, left: floatingPopup.left }}
          onMouseEnter={cancelClosePopup}
          onMouseLeave={() => scheduleClosePopup()}
        >
          {/* Invisible hover-bridge: extends pointer area downward to cover any remaining gap to the avatar */}
          <div className="pointer-events-auto absolute -bottom-2 left-0 right-0 h-2" onMouseEnter={cancelClosePopup} />
          <div className={`h-1 w-full ${
            floatingPopup.isMe ? 'bg-gradient-to-r from-yellow-500 to-yellow-300' : 'bg-gradient-to-r from-violet-600 to-blue-500'
          }`} />
          <div className="flex items-center gap-3 p-3">
            {/* Avatar */}
            <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl overflow-hidden ring-2 ${
              floatingPopup.isMe ? 'ring-yellow-500/40' : 'ring-violet-500/40'
            }`}>
              {popupPic ? (
                <img src={popupPic} alt={floatingPopup.name} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-base font-black ${
                  floatingPopup.isMe ? 'bg-yellow-500/20 text-yellow-200' : 'bg-violet-500/20 text-violet-200'
                }`}>
                  {(floatingPopup.name?.[0] ?? '?').toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className={`text-[9px] font-black uppercase tracking-[0.25em] ${
                floatingPopup.isMe ? 'text-yellow-500' : 'text-violet-400'
              }`}>
                {floatingPopup.isMe ? 'You' : 'Friend'}
              </div>
              <div className="truncate text-sm font-bold text-white leading-tight mt-0.5">{floatingPopup.name}</div>
              <div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${
                floatingPopup.isMe ? 'text-yellow-400/70' : 'text-violet-400/70'
              }`}>
                <Lightbulb className="h-2.5 w-2.5" />
                Has set a hint
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overflow hinters popup (+N) */}
      {overflowPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOverflowPopup(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-72 animate-[popIn_0.18s_ease-out] overflow-hidden rounded-2xl border border-white/10 bg-[#141418] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-white/20 to-white/5" />
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-white/60">More Hinters</span>
                <button onClick={() => setOverflowPopup(null)} className="text-white/30 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {hintLoading === overflowPopup.vocabId ? (
                <div className="flex items-center gap-2 text-sm text-white/40 py-3">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Loading…
                </div>
              ) : (
                <div className="space-y-2">
                  {overflowHinters.map((h) => {
                    const d = hintDetails[overflowPopup.vocabId]
                    const pic = (h.isMe
                      ? d?.my_hint?.profile_picture
                      : d?.friends_hints.find((f) => String(f.user_id) === h.key)?.profile_picture)
                      ?? h.pic
                    return (
                      <button
                        key={h.key}
                        className="flex w-full items-center gap-3 rounded-xl p-2.5 ring-1 ring-white/5 transition hover:bg-white/[0.04] hover:ring-white/10"
                        onClick={(e) => { setOverflowPopup(null); openAvatarPopup(e, overflowPopup.vocabId, h.key, h.isMe, h.name, h.pic) }}
                      >
                        <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full overflow-hidden ring-1 ${
                          h.isMe ? 'ring-yellow-500/40 bg-yellow-500/20' : 'ring-violet-500/30 bg-violet-500/20'
                        }`}>
                          {pic
                            ? <img src={pic} alt={h.name} className="h-full w-full object-cover" />
                            : <span className={`text-xs font-black ${ h.isMe ? 'text-yellow-200' : 'text-violet-200' }`}>{(h.name?.[0] ?? '?').toUpperCase()}</span>
                          }
                        </div>
                        <span className="flex-1 truncate text-sm font-semibold text-white/80">{h.name}</span>
                        <Lightbulb className={`h-3.5 w-3.5 flex-none ${ h.isMe ? 'text-yellow-400' : 'text-violet-400' }`} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Units
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <BookOpen className="h-4 w-4" />
            {unit?.level} - {unit?.name}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            Vocabulary Study
          </h2>
          <p className="mt-2 text-base text-white/50">
            Memorize these words before taking the quiz. Add personal hints to help you remember.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Vocabulary Table */}
      {vocabulary.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-yellow-500">
                  Hiragana
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-yellow-500">
                  English
                </th>
                <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider text-yellow-500 w-32">
                  Hint
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vocabulary.map((item) => (
                <HintRow
                  key={item.id}
                  item={item}
                  currentUserName={authState?.user?.username ?? ''}
                  isOpen={openHintId === item.id}
                  hintInput={hintInputs[item.id] ?? item.my_hint ?? ''}
                  saving={hintSaving === item.id}
                  details={hintDetails[item.id]}
                  loading={hintLoading === item.id}
                  error={hintError[item.id]}
                  editing={!!hintEditing[item.id]}
                  onToggle={() => toggleHint(item.id)}
                  onHintChange={(val) => setHintInputs((prev) => ({ ...prev, [item.id]: val }))}
                  onSave={() => saveHint(item.id)}
                  onClose={() => setOpenHintId(null)}
                  onEdit={() => setHintEditing((prev) => ({ ...prev, [item.id]: true }))}
                  onCancelEdit={() => {
                    setHintEditing((prev) => ({ ...prev, [item.id]: false }))
                    const t = (hintDetails[item.id]?.my_hint?.hint_text ?? item.my_hint ?? '').toString()
                    setHintInputs((prev) => ({ ...prev, [item.id]: t }))
                  }}                  activePopupVocabId={floatingPopup?.vocabId}                  onAvatarEnter={(e, userKey, isMe, name, pic) => openAvatarPopup(e, item.id, userKey, isMe, name, pic)}
                  onAvatarLeave={() => scheduleClosePopup()}
                  onAvatarClick={(e, userKey, isMe, name, pic) => openAvatarPopup(e, item.id, userKey, isMe, name, pic)}
                  onOverflowClick={() => openOverflowPopup(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vocabulary.length === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No vocabulary items yet</p>
        </div>
      )}

      {/* Quiz Button */}
      {vocabulary.length > 0 && !error && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/app/course/unit/${unitId}/vocabulary/quiz`)}
            className="rounded-xl bg-red-600 px-8 py-4 text-base font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition hover:bg-red-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] active:scale-95"
          >
            Take Quiz Now
          </button>
        </div>
      )}
    </div>
  )
}

type HintRowProps = {
  item: VocabItem
  currentUserName: string
  isOpen: boolean
  hintInput: string
  saving: boolean
  details?: HintDetails
  loading: boolean
  error?: string
  editing: boolean
  onToggle: () => void
  onHintChange: (val: string) => void
  onSave: () => void
  onClose: () => void
  onEdit: () => void
  onCancelEdit: () => void
  onAvatarEnter: (e: React.MouseEvent, userKey: string, isMe: boolean, name: string, pic?: string | null) => void
  onAvatarLeave: () => void
  onAvatarClick: (e: React.MouseEvent, userKey: string, isMe: boolean, name: string, pic?: string | null) => void
  onOverflowClick: () => void
  activePopupVocabId?: number
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  return (
    <div className={`${sizeClass} rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/20 flex items-center justify-center overflow-hidden`}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-yellow-300">{initial}</span>
      )}
    </div>
  )
}

function HintRow({
  item,
  currentUserName,
  isOpen,
  hintInput,
  saving,
  details,
  loading,
  error,
  editing,
  onToggle,
  onHintChange,
  onSave,
  onClose,
  onEdit,
  onCancelEdit,
  onAvatarEnter,
  onAvatarLeave,
  onAvatarClick,
  onOverflowClick,
  activePopupVocabId,
}: HintRowProps & { activePopupVocabId?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMyHint = !!item.my_hint

  useEffect(() => {
    if (isOpen && editing) textareaRef.current?.focus()
  }, [isOpen, editing])

  const friendCount = item.friends_hints.length
  const hasAny = hasMyHint || friendCount > 0

  // Build the hint-icon stack: user first (if they have a hint), then friends
  const allHinters: { key: string; name: string; isMe: boolean; pic?: string | null }[] = [
    ...(hasMyHint ? [{ key: 'me', name: currentUserName || 'You', isMe: true, pic: null as string | null }] : []),
    ...item.friends_hints.map((fh) => ({ key: String(fh.user_id), name: fh.display_name, isMe: false, pic: fh.profile_picture ?? null })),
  ]
  const visibleHinters = allHinters.slice(0, 3)
  const hiddenCount = allHinters.length - visibleHinters.length

  return (
    <>
      <tr className="group transition hover:bg-white/[0.02]">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">{item.target}</span>
            <SpeakButton text={item.target} />
          </div>
        </td>
        <td className="px-6 py-4 text-base text-white/70">
          {item.correct}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-2">
            {/* Overlapping profile circles: user (if hinted) + friends — inline, left of lightbulb */}
            {allHinters.length > 0 && (
              <div className="flex items-center">
                {visibleHinters.map((h, idx) => (
                  <button
                    key={h.key}
                    type="button"
                    style={{ marginLeft: idx === 0 ? 0 : '-5px', zIndex: visibleHinters.length - idx }}
                    className={`relative h-5 w-5 flex-none rounded-full ring-[1.5px] ring-[#0d0d0d] flex items-center justify-center overflow-hidden cursor-pointer transition-transform hover:scale-110 hover:z-10 ${
                      h.isMe ? 'bg-yellow-500/30' : 'bg-violet-500/25'
                    }`}
                    title={h.isMe ? `You (${h.name})` : h.name}
                    onMouseEnter={(e) => onAvatarEnter(e, h.key, h.isMe, h.name, h.pic)}
                    onMouseLeave={onAvatarLeave}
                    onClick={(e) => onAvatarClick(e, h.key, h.isMe, h.name, h.pic)}
                  >
                    {h.pic ? (
                      <img src={h.pic} alt={h.name} className="h-full w-full object-cover pointer-events-none" />
                    ) : (
                      <span className={`text-[8px] font-black leading-none pointer-events-none ${
                        h.isMe ? 'text-yellow-200' : 'text-violet-200'
                      }`}>
                        {(h.name?.[0] ?? '?').toUpperCase()}
                      </span>
                    )}
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    style={{ marginLeft: '-5px', zIndex: 0 }}
                    className="h-5 w-5 flex-none rounded-full bg-white/10 ring-[1.5px] ring-[#0d0d0d] flex items-center justify-center cursor-pointer transition-transform hover:scale-110 hover:bg-white/20"
                    title={`+${hiddenCount} more`}
                    onClick={onOverflowClick}
                  >
                    <span className="text-[7px] font-black text-white/50 leading-none pointer-events-none">+{hiddenCount}</span>
                  </button>
                )}
              </div>
            )}
            {/* Lightbulb toggle button — glows when floater is open for this row */}
            <button
              onClick={onToggle}
              title={hasAny ? 'View hints' : 'Add a personal hint'}
              className={`inline-flex flex-none items-center justify-center h-8 w-8 rounded-lg ring-1 transition-all duration-200 ${
                activePopupVocabId === item.id
                  ? 'bg-yellow-500/30 ring-yellow-400/80 text-yellow-300 shadow-[0_0_14px_rgba(234,179,8,0.5)] scale-110'
                  : hasAny
                  ? 'bg-yellow-500/20 ring-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-white/[0.05] ring-white/10 text-white/30 hover:bg-yellow-500/10 hover:ring-yellow-400/30 hover:text-yellow-400'
              }`}
            >
              <Lightbulb className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Inline hint panel */}
      {isOpen && (
        <tr>
          <td colSpan={3} className="px-6 pb-5 pt-1 bg-yellow-500/[0.04]">
            <div className="rounded-xl border border-yellow-500/20 bg-black/30 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Hints for "{item.target}"
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white transition" title="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error ? (
                <div className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
                  {error}
                </div>
              ) : null}

              {loading && !details ? (
                <div className="text-sm text-white/40">Loading…</div>
              ) : null}

              {/* Your hint */}
              {details ? (
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar
                        name={details.my_hint.display_name || 'You'}
                        url={details.my_hint.profile_picture}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white">
                          {details.my_hint.display_name || 'You'}
                        </div>
                        {!editing ? (
                          <div className="mt-1 text-sm text-white/70 whitespace-pre-wrap">
                            {details.my_hint.hint_text ? details.my_hint.hint_text : (
                              <span className="text-white/30">No hint yet. Click edit to add one.</span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <textarea
                              ref={textareaRef}
                              value={hintInput}
                              onChange={(e) => onHintChange(e.target.value)}
                              placeholder="Write a memory hook, example sentence, or mnemonic…"
                              maxLength={2000}
                              rows={3}
                              className="w-full resize-none rounded-lg bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/25 ring-1 ring-white/10 focus:outline-none focus:ring-yellow-500/40"
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-white/30">{hintInput.length}/2000</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={onCancelEdit}
                                  className="rounded-lg px-4 py-2 text-xs font-bold text-white/50 ring-1 ring-white/10 transition hover:text-white hover:ring-white/20"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={onSave}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  {saving ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!editing ? (
                      <button
                        onClick={onEdit}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-300 ring-1 ring-yellow-500/20 transition hover:bg-yellow-500/20 hover:ring-yellow-400/40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Friends */}
              {details && details.friends_hints.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50">Friends ({details.friends_hints.length})</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {details.friends_hints.map((fh) => (
                      <div key={fh.user_id} className="flex items-center gap-2 rounded-full bg-white/[0.03] px-2 py-1 ring-1 ring-white/10">
                        <Avatar name={fh.display_name} url={fh.profile_picture} size="sm" />
                        <div className="text-xs font-semibold text-white/70">{fh.display_name}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {details.friends_hints.map((fh) => (
                      <div key={fh.user_id} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                        <div className="flex items-start gap-3">
                          <Avatar name={fh.display_name} url={fh.profile_picture} />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white">{fh.display_name}</div>
                            <div className="mt-1 text-sm text-white/70 whitespace-pre-wrap">{fh.hint_text}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : details && !loading ? (
                <div className="text-sm text-white/30">No friends have saved a hint for this word yet.</div>
              ) : null}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

