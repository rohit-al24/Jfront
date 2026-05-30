import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronLeft, Volume2, Lightbulb, X, Save } from 'lucide-react'
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
  const [viewingFriendHint, setViewingFriendHint] = useState<FriendHintDetail | null>(null)
  const [loadingFriendHint, setLoadingFriendHint] = useState(false)

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

  function toggleHint(vocabId: number) {
    if (openHintId === vocabId) {
      setOpenHintId(null)
    } else {
      setOpenHintId(vocabId)
    }
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
      setOpenHintId(null)
    } catch {
      // keep panel open so user can retry
    } finally {
      setHintSaving(null)
    }
  }

  async function viewFriendHint(vocabId: number, friend: FriendHint) {
    setLoadingFriendHint(true)
    try {
      const data = await apiFetch<{ my_hint: { hint_text: string | null } | null; friends_hints: Array<{ user_id: number; display_name: string; hint_text: string }> }>(
        `/api/hints/vocab/${vocabId}/`
      )
      const fh = (data.friends_hints ?? []).find((h) => h.user_id === friend.user_id)
      if (fh) {
        setViewingFriendHint({ user_id: fh.user_id, display_name: fh.display_name, hint_text: fh.hint_text })
      }
    } catch {
      // ignore
    } finally {
      setLoadingFriendHint(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Friend hint modal */}
      {viewingFriendHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a0a0a] p-6 ring-1 ring-yellow-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-yellow-400 font-bold">
                <Lightbulb className="h-4 w-4" />
                {viewingFriendHint.display_name}'s Hint
              </div>
              <button onClick={() => setViewingFriendHint(null)} className="text-white/40 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-white/80 text-base leading-relaxed">{viewingFriendHint.hint_text}</p>
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
                  loadingFriend={loadingFriendHint}
                  onToggle={() => toggleHint(item.id)}
                  onHintChange={(val) => setHintInputs((prev) => ({ ...prev, [item.id]: val }))}
                  onSave={() => saveHint(item.id)}
                  onCancel={() => setOpenHintId(null)}
                  onViewFriendHint={(friend) => viewFriendHint(item.id, friend)}
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
  loadingFriend: boolean
  onToggle: () => void
  onHintChange: (val: string) => void
  onSave: () => void
  onCancel: () => void
  onViewFriendHint: (friend: FriendHint) => void
}

function HintRow({
  item,
  isOpen,
  hintInput,
  saving,
  loadingFriend,
  onToggle,
  onHintChange,
  onSave,
  onCancel,
  onViewFriendHint,
}: HintRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMyHint = !!item.my_hint

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus()
  }, [isOpen])

  return (
    <>
      <tr className="group transition hover:bg-white/[0.02]">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">{item.target}</span>
            <SpeakButton text={item.target} />
          </div>
          {/* Friend hint indicators */}
          {item.friends_hints.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.friends_hints.map((fh) => (
                <button
                  key={fh.user_id}
                  onClick={() => onViewFriendHint(fh)}
                  disabled={loadingFriend}
                  title={`${fh.display_name} has a hint — click to view`}
                  className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-400 ring-1 ring-yellow-500/20 transition hover:bg-yellow-500/20 hover:ring-yellow-400/40"
                >
                  <Lightbulb className="h-3 w-3" />
                  {fh.display_name}
                </button>
              ))}
            </div>
          )}
        </td>
        <td className="px-6 py-4 text-base text-white/70">
          {item.correct}
        </td>
        <td className="px-4 py-4 text-center">
          <button
            onClick={onToggle}
            title={hasMyHint ? 'Edit your hint' : 'Add a personal hint'}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 transition-all duration-200 ${
              hasMyHint
                ? 'bg-yellow-500/20 ring-yellow-400/40 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-white/[0.05] ring-white/10 text-white/30 hover:bg-yellow-500/10 hover:ring-yellow-400/30 hover:text-yellow-400'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {/* Inline hint editor */}
      {isOpen && (
        <tr>
          <td colSpan={3} className="px-6 pb-5 pt-1 bg-yellow-500/[0.04]">
            <div className="rounded-xl border border-yellow-500/20 bg-black/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400">
                <Lightbulb className="h-3.5 w-3.5" />
                Personal Hint for "{item.target}"
              </div>
              <textarea
                ref={textareaRef}
                value={hintInput}
                onChange={(e) => onHintChange(e.target.value)}
                placeholder="Write a memory hook, example sentence, or mnemonic…"
                maxLength={2000}
                rows={3}
                className="w-full resize-none rounded-lg bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/25 ring-1 ring-white/10 focus:outline-none focus:ring-yellow-500/40"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">{hintInput.length}/2000</span>
                <div className="flex gap-2">
                  <button
                    onClick={onCancel}
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
                    {saving ? 'Saving…' : 'Save Hint'}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

