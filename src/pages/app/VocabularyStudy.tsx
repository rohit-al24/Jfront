import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronLeft, Volume2, Lightbulb, X, Save, Pencil } from 'lucide-react'
import { apiFetch } from '../../api'
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

  return (
    <div className="space-y-6">
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
                <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider text-yellow-500 w-20">
                  Hint
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vocabulary.map((item) => (
                <HintRow
                  key={item.id}
                  item={item}
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
                  }}
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
}: HintRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMyHint = !!item.my_hint

  useEffect(() => {
    if (isOpen && editing) textareaRef.current?.focus()
  }, [isOpen, editing])

  const friendCount = item.friends_hints.length
  const hasAny = hasMyHint || friendCount > 0

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
        <td className="px-4 py-4 text-center">
          <button
            onClick={onToggle}
            title={hasAny ? 'View hints' : 'Add a personal hint'}
            className={`relative inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 transition-all duration-200 ${
              hasAny
                ? 'bg-yellow-500/20 ring-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-white/[0.05] ring-white/10 text-white/30 hover:bg-yellow-500/10 hover:ring-yellow-400/30 hover:text-yellow-400'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            {friendCount > 0 && !hasMyHint && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-yellow-400" />
            )}
          </button>
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

