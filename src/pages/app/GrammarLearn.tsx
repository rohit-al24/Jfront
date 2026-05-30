import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, Lock, Map, Swords, Volume2 } from 'lucide-react'

import { apiFetch } from '../../api'
import { saveUnitProgress } from '../../hooks/useUnitProgress'
import { ExitWarningDialog } from '../../components/ExitWarningDialog'

type LearnItem = {
  id: number
  exam_level: number
  exam_code: string
  topic_order: number
  title: string
  main_character: string
  logic_formula: string
  explanation: string
  examples: { jp: string; en: string }[]
  visual_type: string
  pakka_tip: string
}

type UnitInfo = {
  id: number
  unit_number: number
  name: string
  level: string
}

type LearnResponse = {
  unit: UnitInfo
  exam_code: string
  items: LearnItem[]
}

type DistanceMapData = {
  near_me: { word: string; tip?: string }
  near_you: { word: string; tip?: string }
  far: { word: string; tip?: string }
}

function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

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

const PARTICLES = new Set([
  '\u306F', '\u304C', '\u3092', '\u306B', '\u3067', '\u3078', '\u3082', '\u3068', '\u306E', '\u304B', '\u3084',
  '\u304B\u3089', '\u307E\u3067', '\u3088\u308A', '\u306D', '\u3088', '\u306A', '\u308F', '\u305E', '\u3055',
])
const VERBS = new Set([
  '\u3067\u3059', '\u3058\u3083\u3042\u308A\u307E\u305B\u3093', '\u307E\u3059', '\u307E\u305B\u3093', '\u3067\u3059\u304B', '\u3067\u3057\u305F',
  '\u3067\u306F\u3042\u308A\u307E\u305B\u3093', '\u3060', '\u3067\u3057\u3087\u3046',
])
function isVerb(p: string) {
  return VERBS.has(p) || p.endsWith('\u307E\u3059') || p.endsWith('\u307E\u305B\u3093') || p.endsWith('\u3067\u3059')
}

function segmentJapanese(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('ja-JP', { granularity: 'word' })
    return Array.from(seg.segment(text), (s) => s.segment)
  } catch {
    return [...text]
  }
}

// ─── Formula Bar ─────────────────────────────────────────────────────────────

function FormulaBlocks({ formula, mainCharacter }: { formula: string; mainCharacter: string }) {
  const parts = useMemo(() => (formula ?? '').split(/\s+/).filter(Boolean), [formula])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {parts.map((p, i) => {
        if (p === '+') return <span key={i} className="text-white/30 text-xl font-bold">+</span>

        const isN1   = p.includes('N1') || p.includes('[N1]')
        const isN2   = p.includes('N2') || p.includes('[N2]')
        const isPtc  = PARTICLES.has(p)
        const isVrb  = isVerb(p)
        const isHero = mainCharacter && p === mainCharacter

        const cls = isN1   ? 'bg-sky-500/20 text-sky-200 ring-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
          : isN2   ? 'bg-orange-500/20 text-orange-200 ring-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
          : isVrb  ? 'bg-red-500/20 text-red-200 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
          : isHero || isPtc ? 'bg-yellow-400/15 text-yellow-200 ring-yellow-400/50 shadow-[0_0_12px_rgba(234,179,8,0.25)]'
          : 'bg-white/[0.07] text-white/85 ring-white/15'

        return (
          <span key={`${p}-${i}`} className={`rounded-xl px-5 py-2.5 text-lg font-black ring-1 md:text-xl ${cls}`}>
            {p}
          </span>
        )
      })}
    </div>
  )
}

// ─── Tappable Example Sentence ───────────────────────────────────────────────

function TappableJapanese({
  text,
  highlightParticles,
  underlineWord,
}: {
  text: string
  highlightParticles: boolean
  underlineWord?: string
}) {
  const tokens = useMemo(() => segmentJapanese(text), [text])
  const [spokenIdx, setSpokenIdx] = useState<number | null>(null)

  function handleTap(token: string, idx: number) {
    speakJa(token)
    setSpokenIdx(idx)
    setTimeout(() => setSpokenIdx((s) => (s === idx ? null : s)), 700)
  }

  return (
    <span className="flex flex-wrap items-baseline gap-0.5">
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return null
        if (/^[。、！？…～「」『』（）・]$/.test(token)) {
          return <span key={i} className="text-white/35">{token}</span>
        }

        const isPtc   = PARTICLES.has(token)
        const isVrb   = isVerb(token)
        const isHero  = underlineWord && token === underlineWord
        const isSpoken = spokenIdx === i

        let cls: string
        if (isHero) {
          // Main character in example — underline with yellow, bold
          cls = 'text-yellow-200 font-black underline decoration-yellow-400 decoration-2 underline-offset-4 hover:text-yellow-100'
        } else if (highlightParticles && isPtc) {
          cls = 'bg-yellow-400/20 text-yellow-300 ring-1 ring-yellow-400/50 rounded px-1 py-0.5'
        } else if (isVrb) {
          cls = 'text-red-300 underline decoration-dotted underline-offset-2 hover:text-red-200'
        } else {
          cls = 'text-white hover:text-yellow-300 hover:underline underline-offset-2'
        }

        return (
          <button
            key={i}
            onClick={() => handleTap(token, i)}
            className={`transition-all duration-150 cursor-pointer ${cls} ${isSpoken ? 'scale-110 brightness-125' : ''}`}
          >
            {token}
          </button>
        )
      })}
    </span>
  )
}

// ─── Distance Map ─────────────────────────────────────────────────────────────

function DistanceMapInline({ item }: { item: LearnItem }) {
  const data = useMemo(() => safeJson<DistanceMapData>(item.explanation), [item.explanation])

  if (!data) {
    return <p className="text-sm leading-relaxed text-white/70">{item.explanation}</p>
  }

  const zones = [
    { label: 'Near Me',  key: 'near_me'  as const, color: 'sky' },
    { label: 'Near You', key: 'near_you' as const, color: 'yellow' },
    { label: 'Far',      key: 'far'      as const, color: 'red' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-white/40">
        <Map className="h-3.5 w-3.5" /> Spatial Distance Map
      </div>
      <div className="grid grid-cols-3 gap-2">
        {zones.map(({ label, key, color }) => (
          <button
            key={key}
            onClick={() => speakJa(data[key].word)}
            className={`rounded-xl p-3 text-center ring-1 transition hover:brightness-110 active:scale-95
              bg-${color}-500/10 ring-${color}-500/20`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-[0.25em] text-${color}-300`}>{label}</p>
            <p className="mt-2 text-2xl font-black text-white">{data[key].word}</p>
            {data[key].tip && (
              <p className={`mt-1 text-xs text-${color}-200/70`}>{data[key].tip}</p>
            )}
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-white/30">
              <Volume2 className="h-3 w-3" /> tap
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-sky-300/60">Here (これ)</span>
        <div className="flex-1 mx-3 h-px bg-gradient-to-r from-sky-500/40 via-yellow-500/40 to-red-500/40" />
        <span className="text-xs text-red-300/60">There (あれ)</span>
      </div>
    </div>
  )
}

// ─── SOV legend pills ─────────────────────────────────────────────────────────

const SOV_LEGEND = [
  { label: 'Subject',  cls: 'bg-sky-500/20 ring-sky-500/40 text-sky-200' },
  { label: 'Object',   cls: 'bg-orange-500/20 ring-orange-500/40 text-orange-200' },
  { label: 'Verb',     cls: 'bg-red-500/20 ring-red-500/40 text-red-200' },
  { label: 'Particle', cls: 'bg-yellow-400/15 ring-yellow-400/40 text-yellow-200' },
] as const

// ─── Main page ────────────────────────────────────────────────────────────────

export function GrammarLearn() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const examCode = (params.get('exam_code') || '').toUpperCase()

  const [unit, setUnit] = useState<UnitInfo | null>(null)
  const [items, setItems] = useState<LearnItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cardIdx, setCardIdx] = useState(0)
  const [seenSet, setSeenSet] = useState<Set<number>>(new Set([0]))
  const [showExitWarning, setShowExitWarning] = useState(false)

  const load = useCallback(() => {
    if (!unitId) return
    const qs = examCode ? `?exam_code=${encodeURIComponent(examCode)}` : ''
    apiFetch<LearnResponse>(`/api/course/unit/${unitId}/grammar/learn/${qs}`)
      .then((r) => {
        setUnit(r.unit)
        setItems(r.items.sort((a, b) => a.topic_order - b.topic_order))
        setCardIdx(0)
        setSeenSet(new Set([0]))
        setError(null)
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load grammar learn content'))
  }, [unitId, examCode])

  useEffect(() => { load() }, [load])

  // Save learn progress to localStorage whenever the user advances through topics
  // (uses items.length directly to avoid forward-reference issues with `total`)
  useEffect(() => {
    if (unitId && items.length > 0) {
      saveUnitProgress(unitId, { grammarLearnPct: Math.round((seenSet.size / items.length) * 100) })
    }
  }, [seenSet, items, unitId])

  const total = items.length
  const quizUnlocked = total > 0 && seenSet.size >= total

  function goNext() {
    if (cardIdx < total - 1) {
      const next = cardIdx + 1
      setCardIdx(next)
      setSeenSet((s) => new Set([...s, next]))
    }
  }

  function goPrev() {
    if (cardIdx > 0) setCardIdx((c) => c - 1)
  }

  function startQuiz() {
    const qs = examCode ? `?exam_code=${examCode}` : ''
    navigate(`/app/course/unit/${unitId}/grammar/quiz${qs}`)
  }

  const currentCard = items[cardIdx] ?? null
  const highlightParticles = (currentCard?.visual_type ?? '') === 'Particle_Highlight'
  const isDistanceMap = (currentCard?.visual_type ?? '') === 'Distance_Map'
  const progressPct = total > 0 ? Math.round((seenSet.size / total) * 100) : 0

  // Auto-derive the hero character: prefer the stored field, then fall back to
  // the first particle token found inside logic_formula (the yellow pill).
  const derivedMainChar = useMemo(() => {
    if (!currentCard) return ''
    if (currentCard.main_character) return currentCard.main_character
    const tokens = (currentCard.logic_formula ?? '').split(/\s+/).filter(Boolean)
    return tokens.find(t => PARTICLES.has(t)) ?? ''
  }, [currentCard])

  return (
    <div className="space-y-5">
      {showExitWarning && (
        <ExitWarningDialog
          onStay={() => setShowExitWarning(false)}
          onLeave={() => navigate(-1)}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-5 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => (seenSet.size > 0 && seenSet.size < total) ? setShowExitWarning(true) : navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.3em] text-yellow-500">
            <BookOpen className="h-4 w-4" /> {unit?.level} · {unit?.name}
          </div>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Grammar · Learn</h2>

          {total > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/40">{seenSet.size} / {total} topics reviewed</p>
                <p className="text-sm font-bold text-yellow-400">{progressPct}%</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      {total > 0 && currentCard && (
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">

          {/* Top bar: dot nav */}
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCardIdx(i); setSeenSet((s) => new Set([...s, i])) }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === cardIdx
                      ? 'w-8 bg-yellow-400'
                      : seenSet.has(i)
                      ? 'w-2.5 bg-yellow-500/40'
                      : 'w-2.5 bg-white/15'
                  }`}
                />
              ))}
              <span className="ml-auto text-sm font-bold text-white/40">
                {cardIdx + 1} / {total}
              </span>
            </div>
          </div>

          {/* ── HERO: main_character ──────────────────────────────────────── */}
          <div className="px-6 pt-8 pb-4 text-center">
            {/* Topic number + title */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-black text-yellow-300 ring-1 ring-yellow-500/30">
                {currentCard.topic_order}
              </span>
              <h3 className="text-2xl font-black text-white leading-tight md:text-3xl">{currentCard.title}</h3>
            </div>

            {/* Main character — the visual anchor */}
            {derivedMainChar && (
              <button
                onClick={() => speakJa(derivedMainChar)}
                className="group relative inline-block"
                title="Tap to hear"
              >
                {/* Glow ring */}
                <span className="absolute inset-0 rounded-2xl bg-yellow-400/10 blur-xl group-hover:bg-yellow-400/20 transition-all duration-300" />
                <span
                  className="relative block font-black text-yellow-300 leading-none tracking-tight"
                  style={{ fontSize: 'clamp(2.8rem, 10vw, 4.5rem)' }}
                >
                  {derivedMainChar}
                </span>
                <span className="mt-2 flex items-center justify-center gap-1 text-[10px] text-white/25 group-hover:text-yellow-400/60 transition-colors">
                  <Volume2 className="h-3 w-3" /> tap to hear
                </span>
              </button>
            )}
          </div>

          {/* Card body */}
          <div className="px-6 pb-6 space-y-5">

            {/* ── Explanation ──────────────────────────────────────────────── */}
            {!isDistanceMap && currentCard.explanation && (
              <p className="text-base font-semibold leading-relaxed text-white/70 text-center md:text-lg">
                {currentCard.explanation}
              </p>
            )}

            {isDistanceMap && <DistanceMapInline item={currentCard} />}

            {/* ── Formula Bar ──────────────────────────────────────────────── */}
            {currentCard.logic_formula && (
              <div className="rounded-2xl bg-black/40 p-4 ring-1 ring-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {/* Color legend */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {SOV_LEGEND.map(({ label, cls }) => (
                    <span key={label} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${cls}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <FormulaBlocks
                  formula={currentCard.logic_formula}
                  mainCharacter={derivedMainChar}
                />
              </div>
            )}

            {/* ── Example List (one entry per grouped row) ─────────────────── */}
            {currentCard.examples.length > 0 && (
              <div className="rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10 space-y-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-white/40 md:text-sm">
                  <Volume2 className="h-3.5 w-3.5" /> Tap any word to hear it
                </div>
                {currentCard.examples.map((ex, ei) => (
                  <div key={ei} className={`space-y-2 ${ei > 0 ? 'pt-4 border-t border-white/[0.06]' : ''}`}>
                    {ex.jp && (
                      <p className="text-2xl font-black leading-relaxed md:text-3xl">
                        <TappableJapanese
                          text={ex.jp}
                          highlightParticles={highlightParticles}
                          underlineWord={derivedMainChar || undefined}
                        />
                      </p>
                    )}
                    {ex.en && (
                      <p className="text-base text-white/60 font-medium md:text-lg">{ex.en}</p>
                    )}
                    {ex.jp && (
                      <button
                        onClick={() => speakJa(ex.jp)}
                        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-white/50 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white active:scale-95"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> Speak
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Pakka Mastery — Trap Warning ─────────────────────────────── */}
            {currentCard.pakka_tip && (
              <div className="rounded-xl bg-gradient-to-br from-yellow-950/70 to-yellow-900/20 p-4 ring-1 ring-yellow-500/40">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20 ring-1 ring-yellow-500/30">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
                    Pakka Mastery — Trap Warning
                  </p>
                </div>
                <p className="text-base font-semibold leading-relaxed text-yellow-100/80 md:text-lg">
                  {currentCard.pakka_tip}
                </p>
              </div>
            )}
          </div>

          {/* Card navigation footer */}
          <div className="px-6 pb-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
            <button
              onClick={goPrev}
              disabled={cardIdx === 0}
              className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-5 py-3 text-base font-bold text-white/60 ring-1 ring-white/10 transition hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" /> Prev
            </button>
            <div className="flex-1" />
            {cardIdx < total - 1 ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 rounded-xl bg-yellow-500 px-6 py-3 text-base font-black text-black transition hover:bg-yellow-400 active:scale-95"
              >
                Next <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <p className="text-sm font-bold text-emerald-400/80">✓ All topics reviewed</p>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {total === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No learn content yet</p>
        </div>
      )}

      {/* ── Quiz CTA ──────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className={`rounded-2xl p-5 ring-1 transition-all duration-500 ${
          quizUnlocked
            ? 'bg-gradient-to-br from-yellow-950/50 to-black ring-yellow-500/30'
            : 'bg-white/[0.02] ring-white/[0.08]'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
              quizUnlocked ? 'bg-yellow-500/20 ring-yellow-500/30' : 'bg-white/[0.04] ring-white/10'
            }`}>
              {quizUnlocked
                ? <Swords className="h-6 w-6 text-yellow-400" />
                : <Lock className="h-6 w-6 text-white/30" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-black md:text-lg ${quizUnlocked ? 'text-white' : 'text-white/40'}`}>
                {quizUnlocked ? 'Quiz Unlocked' : 'Complete all topics to unlock'}
              </p>
              <p className={`text-sm mt-1 ${quizUnlocked ? 'text-white/60' : 'text-white/25'}`}>
                {quizUnlocked
                  ? "You've reviewed all the blueprints — go test your knowledge!"
                  : `${seenSet.size} of ${total} topics reviewed`}
              </p>
            </div>
            <button
              onClick={startQuiz}
              disabled={!quizUnlocked}
              className="shrink-0 rounded-xl px-6 py-3 text-base font-black transition active:scale-95 disabled:cursor-not-allowed
                bg-yellow-500 text-black hover:bg-yellow-400
                disabled:bg-white/[0.06] disabled:text-white/25"
            >
              Start Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

