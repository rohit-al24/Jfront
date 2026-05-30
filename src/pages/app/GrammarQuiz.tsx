import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Hammer, Repeat2, Sword, CheckCircle2, AlertTriangle, Volume2 } from 'lucide-react'

import { apiFetch } from '../../api'
import { saveUnitProgress } from '../../hooks/useUnitProgress'
import { ExitWarningDialog } from '../../components/ExitWarningDialog'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type PakkaItem = {
  id: number
  step_type: number
  logic_formula: string
  english_prompt: string
  correct_sentence: string
  word_blocks: string[]
  particle_target: string
  distractors?: string[]
  explanation_hint: string
  exam_level: number
  exam_code: string
}

type PakkaResponse = {
  unit: { id: number; unit_number: number; name: string; level: string }
  exam_code: string
  items: PakkaItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const VERBS = new Set(['です', 'じゃありません', 'ます', 'ません', 'ですか', 'でした', 'ではありません'])
function isVerbBlock(b: string) { return VERBS.has(b.trim()) || b.trim().endsWith('ます') || b.trim().endsWith('ません') }

function speakJa(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

function playSuccess() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx  = new Ctx() as AudioContext
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime)       // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    osc.start()
    osc.stop(ctx.currentTime + 0.55)
  } catch { /* ignore */ }
}

function buildParticleOptions(item: PakkaItem): string[] {
  const target = (item.particle_target || '').trim()
  const dist   = (item.distractors || []).map(d => d.trim()).filter(Boolean)
  const opts   = [target, ...dist].filter(Boolean)
  const fill   = ['は', 'が', 'を', 'に', 'も', 'で', 'へ', 'と', 'の', 'か']
  for (const p of fill) { if (opts.length >= 4) break; if (!opts.includes(p)) opts.push(p) }
  return shuffle(opts).slice(0, 4)
}

// Block colour chip helper (reuses SOV colours)
function blockColor(block: string, hint: boolean) {
  if (!hint) return 'bg-white/[0.07] text-white ring-white/15'
  const PARTICLES = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'も', 'と', 'の', 'か', 'や'])
  if (isVerbBlock(block)) return 'bg-red-500/20 text-red-200 ring-red-500/40'
  if (PARTICLES.has(block.trim())) return 'bg-yellow-400/15 text-yellow-200 ring-yellow-400/35'
  return 'bg-sky-500/15 text-sky-200 ring-sky-500/35'
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Phase heading pill
// ─────────────────────────────────────────────────────────────────────────────
function PhasePill({ phase }: { phase: 'builder' | 'loop' | 'beast' }) {
  const cfg = {
    builder: { icon: <Hammer className="h-3 w-3" />, label: 'Stage 2 · Builder',    bg: 'bg-sky-500/20 text-sky-200 ring-sky-500/30' },
    loop:    { icon: <Repeat2 className="h-3 w-3" />, label: 'Stage 3 · Heavy Loop', bg: 'bg-yellow-500/20 text-yellow-200 ring-yellow-500/30' },
    beast:   { icon: <Sword  className="h-3 w-3" />, label: 'Stage 4 · Beast Mode', bg: 'bg-red-500/20 text-red-200 ring-red-500/30' },
  }[phase]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: 5-second failure modal
// ─────────────────────────────────────────────────────────────────────────────
function FailModal({ hint, onDone }: { hint: string; onDone: () => void }) {
  const [ct, setCt] = useState(3)
  useEffect(() => {
    if (ct <= 0) { onDone(); return }
    const t = setTimeout(() => setCt(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [ct, onDone])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#130808] p-6 ring-1 ring-red-500/40 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-black uppercase tracking-wider text-red-300">Wrong Answer</span>
        </div>
        <p className="text-base font-semibold text-white/90 leading-relaxed">{hint || 'Re-read the rule and try again.'}</p>
        <div className="flex items-center justify-between">
          <span className="text-4xl font-black text-red-400">{ct}</span>
          <span className="text-xs text-white/30">Continuing in {ct}s</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(ct / 3) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Stage interstitial
// ─────────────────────────────────────────────────────────────────────────────
function StageComplete({ label, next }: { label: string; next: () => void }) {
  useEffect(() => { const t = setTimeout(next, 1800); return () => clearTimeout(t) }, [next])
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-emerald-950/40 py-16 text-center ring-1 ring-emerald-500/20">
      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
      <p className="text-lg font-black text-white">{label}</p>
      <p className="text-sm text-white/40">Get ready for the next stage…</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder block-assembly view
// ─────────────────────────────────────────────────────────────────────────────
interface BuilderViewProps {
  item: PakkaItem
  showHints: boolean    // false in Beast Mode
  onPass: () => void
}

function BlockAssembly({ item, showHints, onPass }: BuilderViewProps) {
  const slotCount = item.word_blocks.length
  const init = () => ({ tray: shuffle([...item.word_blocks]), placed: Array<string | null>(slotCount).fill(null), sel: null as number | null, result: null as 'ok' | 'no' | null, denySlot: null as number | null })
  const [state, setState] = useState(init)
  const [shaking, setShaking] = useState(false)

  // Reset on item change
  useEffect(() => { setState(init()) }, [item.id])

  // Does this question use か as a separate sentence-ending block?
  const hasKa = item.word_blocks.includes('か')

  function pickTray(i: number) {
    if (state.result) return
    setState(s => ({ ...s, sel: s.sel === i ? null : i }))
  }

  function tapSlot(si: number) {
    if (state.result) return
    const { placed, tray, sel } = state

    // Tapping a filled slot returns it to tray
    if (placed[si] !== null) {
      setState(s => {
        const np = [...s.placed]; const block = np[si]!; np[si] = null
        return { ...s, placed: np, tray: [...s.tray, block], sel: null, denySlot: null }
      })
      return
    }

    if (sel === null) return
    const block = tray[sel]

    // No slot enforcement: allow any block in any slot

    setState(s => {
      const nt = [...s.tray]; nt.splice(sel!, 1)
      const np = [...s.placed]; np[si] = block
      return { ...s, tray: nt, placed: np, sel: null }
    })
  }

  function checkAnswer() {
    const built = state.placed.join('')
    const ok    = built === item.correct_sentence
    setState(s => ({ ...s, result: ok ? 'ok' : 'no' }))
    if (ok) {
      playSuccess()
      speakJa(item.correct_sentence)
      setTimeout(onPass, 900)
    } else {
      setShaking(true)
      setTimeout(() => setState(init()), 1400)
    }
  }

  const allFilled = state.placed.every(b => b !== null)

  return (
    <div className={`space-y-4 ${shaking ? 'animate-shake' : ''}`} onAnimationEnd={() => setShaking(false)}>
      {/* English prompt */}
      <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
        <p className="text-lg font-black text-white">{item.english_prompt}</p>
        {showHints && item.logic_formula && (
          <p className="mt-1 text-sm font-bold text-white/40">{item.logic_formula}</p>
        )}
      </div>

      {/* Answer slots */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-black/30 p-4 ring-1 ring-white/10 min-h-[56px]">
        {state.placed.map((b, si) => {
          const isDeny = state.denySlot === si
          const isKaSlot   = hasKa && showHints && si === slotCount - 1
          const isVerbSlot = showHints && (hasKa ? si === slotCount - 2 : si === slotCount - 1)
          return (
            <button
              key={si}
              onClick={() => tapSlot(si)}
              className={[
                'rounded-lg px-3 py-2 text-sm font-bold ring-1 transition min-w-[40px]',
                b !== null
                  ? `${blockColor(b, showHints)} opacity-100`
                  : isKaSlot
                    ? 'bg-yellow-400/5 text-yellow-300/40 ring-yellow-500/20 ring-dashed'
                    : isVerbSlot
                      ? 'bg-red-500/5 text-red-300/40 ring-red-500/20 ring-dashed'
                      : 'bg-white/[0.03] text-white/20 ring-white/10 ring-dashed',
                isDeny ? 'animate-shake ring-red-500/60' : '',
              ].join(' ')}
            >
              {b ?? (isKaSlot ? 'か' : isVerbSlot ? 'Verb' : '—')}
            </button>
          )
        })}
      </div>

      {/* Tray */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/10 min-h-[52px]">
        {state.tray.map((b, ti) => (
          <button
            key={`${b}-${ti}`}
            onClick={() => pickTray(ti)}
            className={[
              'rounded-lg px-3 py-2 text-sm font-bold ring-1 transition active:scale-95',
              blockColor(b, showHints),
              state.sel === ti ? 'ring-2 scale-105 brightness-125' : 'hover:brightness-110',
            ].join(' ')}
          >
            {b}
          </button>
        ))}
        {state.tray.length === 0 && <p className="text-xs text-white/20 self-center">All blocks placed</p>}
      </div>

      {/* Feedback / Check */}
      {state.result === 'ok' && (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/20">
          ✓ Correct! &nbsp;<span className="text-white/60">{item.correct_sentence}</span>
        </div>
      )}
      {state.result === 'no' && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 ring-1 ring-red-500/20">
          ✗ Incorrect. Correct: <span className="text-white/70">{item.correct_sentence}</span>
        </div>
      )}
      {!state.result && (
        <button
          disabled={!allFilled}
          onClick={checkAnswer}
          className="w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black disabled:opacity-30 disabled:cursor-not-allowed transition hover:bg-yellow-400 active:scale-[0.98]"
        >
          Check Answer
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'loading' | 'builder' | 'builder_done' | 'loop' | 'loop_done' | 'beast' | 'done' | 'empty'

interface LoopQ {
  item: PakkaItem
  options: string[]
  streak: number
  needed: number
}

export function GrammarQuiz() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate   = useNavigate()
  const [params]   = useSearchParams()
  const examCode   = (params.get('exam_code') || '').toUpperCase()

  const [phase,     setPhase]     = useState<Phase>('loading')
  const [unitTitle, setUnitTitle] = useState('')
  const [error,     setError]     = useState<string | null>(null)

  // ── Builder state
  const [builderItems, setBuilderItems] = useState<PakkaItem[]>([])
  const [bIdx, setBIdx] = useState(0)

  // ── Heavy loop state
  const [loopQueue,  setLoopQueue]  = useState<LoopQ[]>([])
  const [loopTotal,  setLoopTotal]  = useState(0)
  const [lDone,      setLDone]      = useState(0)
  const [lSel,       setLSel]       = useState<string | null>(null)
  const [lFeedback,  setLFeedback]  = useState<'ok' | 'no' | null>(null)
  const [failModal,  setFailModal]  = useState<string | null>(null)  // hint text

  // ── Beast mode state
  const [beastItems, setBeastItems] = useState<PakkaItem[]>([])
  const [beIdx,      setBeIdx]      = useState(0)

  // ── Load
  const load = useCallback(() => {
    if (!unitId) return
    const qs = examCode ? `?exam_code=${encodeURIComponent(examCode)}` : ''
    apiFetch<PakkaResponse>(`/api/course/unit/${unitId}/grammar-pakka/${qs}`)
      .then(r => {
        setUnitTitle(`${r.unit.level} · ${r.unit.name}`)
        const all = r.items

        const s2  = all.filter(x => x.step_type === 2)
        const s3  = all.filter(x => x.step_type === 3)
        const s4  = all.filter(x => x.step_type === 4)

        setBuilderItems(shuffle(s2))
        setLoopQueue(shuffle(s3).map(x => ({ item: x, options: buildParticleOptions(x), streak: 0, needed: 3 })))
        setLoopTotal(s3.length)
        // Beast = step 4 items (or fall back to step 2 recycled)
        setBeastItems(shuffle(s4.length > 0 ? s4 : s2))

        // Jump straight to first available phase
        if (s2.length > 0)      setPhase('builder')
        else if (s3.length > 0) setPhase('loop')
        else if (s4.length > 0) setPhase('beast')
        else setPhase('empty')
      })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load'); setPhase('loading') })
  }, [unitId, examCode])

  useEffect(() => { load() }, [load])

  // Persist grammar quiz completion
  useEffect(() => {
    if (phase === 'done' && unitId) saveUnitProgress(unitId, { grammarQuizDone: true })
  }, [phase, unitId])

  // ── Builder navigation
  const currentBuilder = builderItems[bIdx] ?? null
  function builderPass() {
    if (bIdx + 1 < builderItems.length) { setBIdx(b => b + 1) }
    else {
      if (loopQueue.length > 0) setPhase('builder_done')
      else if (beastItems.length > 0) setPhase('loop_done')
      else setPhase('done')
    }
  }

  // ── Heavy loop logic
  const currentLoop = loopQueue[0] ?? null
  const lTotal      = loopQueue.length + lDone
  const lProgress   = lTotal ? Math.round((lDone / lTotal) * 100) : 0

  function loopPick(opt: string) {
    if (!currentLoop || lFeedback) return
    setLSel(opt)
    const ok = opt === currentLoop.item.particle_target
    if (ok) playSuccess()
    setLFeedback(ok ? 'ok' : 'no')

    setLoopQueue(prev => {
      const [head, ...rest] = prev
      if (ok) {
        const updated = { ...head, streak: head.streak + 1 }
        if (updated.streak >= updated.needed) { setLDone(d => d + 1); return rest }
        return [...rest, updated]
      }
      // wrong: re-insert after 2, reset streak
      const updated = { ...head, streak: 0 }
      const next    = [...rest]
      next.splice(Math.min(2, next.length), 0, updated)
      setFailModal(head.item.explanation_hint)
      return next
    })
  }

  function loopNext() { setLSel(null); setLFeedback(null) }

  function loopDismissModal() {
    setFailModal(null)
    setLSel(null)
    setLFeedback(null)
  }

  function loopDone() {
    if (beastItems.length > 0) setPhase('loop_done')
    else setPhase('done')
  }

  useEffect(() => {
    if (phase === 'loop' && loopQueue.length === 0 && lDone > 0) loopDone()
  }, [loopQueue.length, lDone, phase])

  // ── Beast navigation
  const currentBeast = beastItems[beIdx] ?? null
  function beastPass() {
    if (beIdx + 1 < beastItems.length) { setBeIdx(b => b + 1) }
    else { setPhase('done') }
  }

  // ── Sentence display for loop (blank the particle)
  function blankSentence(item: PakkaItem) {
    const s   = item.correct_sentence
    const tgt = item.particle_target
    if (!tgt) return s
    const idx = s.indexOf(tgt)
    if (idx === -1) return s
    return s.slice(0, idx) + '＿' + s.slice(idx + tgt.length)
  }

  // ── Per-question progress across all phases
  const totalQ   = builderItems.length + loopTotal + beastItems.length
  const doneQ    = bIdx + lDone + beIdx
  const phasePct = phase === 'done' ? 100 : (totalQ > 0 ? Math.round((doneQ / totalQ) * 100) : 0)

  // Navigation guard for unsaved progress
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const isInProgress = phase !== 'done' && phase !== 'empty'
  // Intercept navigation
  useEffect(() => {
    if (!isInProgress) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isInProgress])

  // Intercept back button
  const guardedNavigate = (to: any) => {
    if (isInProgress) setShowLeaveModal(true)
    else navigate(to)
  }

  return (
    <div className="space-y-6">
      {showLeaveModal && (
        <ExitWarningDialog
          onStay={() => setShowLeaveModal(false)}
          onLeave={() => navigate(-1)}
        />
      )}
      {/* Persistent progress bar for unit */}
      <div className="sticky top-0 z-30 bg-black/60 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/60">Unit Progress</span>
          <span className="text-xs font-bold text-white/30">{phasePct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 mt-1">
          <div className="h-full bg-yellow-500 transition-all duration-700" style={{ width: `${phasePct}%` }} />
        </div>
      </div>

      {/* Header */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <button onClick={() => guardedNavigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-yellow-500">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-2xl font-black text-white">Grammar · Quiz</p>
        <p className="mt-1 text-sm text-white/50">{unitTitle}</p>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-yellow-500 transition-all duration-700" style={{ width: `${phasePct}%` }} />
        </div>
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded-2xl bg-white/[0.97] p-6 ring-1 ring-red-500/40 max-w-md w-full space-y-4 text-center">
            <div className="text-2xl font-black text-red-500 mb-2">Warning</div>
            <div className="text-base text-black font-semibold">If you go out, your progress will not save.</div>
            <div className="flex gap-4 mt-4 justify-center">
              <button className="rounded-xl bg-red-500 px-6 py-2 text-sm font-black text-white hover:bg-red-400" onClick={() => { setShowLeaveModal(false); navigate(-1) }}>Leave Anyway</button>
              <button className="rounded-xl bg-gray-300 px-6 py-2 text-sm font-black text-black hover:bg-gray-200" onClick={() => setShowLeaveModal(false)}>Stay</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-sm font-medium text-red-300 ring-1 ring-red-500/30">{error}</div>
      )}

      {/* ── BUILDER ── */}
      {phase === 'builder' && currentBuilder && (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <PhasePill phase="builder" />
            <span className="text-xs font-bold text-white/30">{bIdx + 1} / {builderItems.length}</span>
          </div>
          <p className="text-xs font-bold text-white/30 uppercase tracking-wider">Build the sentence — sentence enders go last</p>
          <BlockAssembly key={currentBuilder.id} item={currentBuilder} showHints onPass={builderPass} />
        </div>
      )}

      {phase === 'builder_done' && (
        <StageComplete label="Builder complete!" next={() => setPhase('loop')} />
      )}

      {/* ── HEAVY LOOP ── */}
      {phase === 'loop' && (
        <>
          {failModal !== null && (
            <FailModal hint={failModal} onDone={loopDismissModal} />
          )}
          {currentLoop ? (
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <PhasePill phase="loop" />
                <span className="text-xs font-bold text-white/30">Need {Math.max(0, currentLoop.needed - currentLoop.streak)} in a row</span>
              </div>

              {/* Progress bar for loop */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${lProgress}%` }} />
              </div>

              {/* Sentence with blank */}
              <div className="rounded-xl bg-black/30 p-4 ring-1 ring-white/10 space-y-1">
                <button onClick={() => speakJa(currentLoop.item.correct_sentence)} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-yellow-400 mb-2">
                  <Volume2 className="h-3 w-3" /> Hear correct sentence
                </button>
                <p className="text-xl font-black text-white tracking-wide">{blankSentence(currentLoop.item)}</p>
                <p className="text-sm text-white/50">{currentLoop.item.english_prompt}</p>
              </div>

              {/* Option buttons */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {currentLoop.options.map(o => {
                  const isPicked    = lSel === o
                  const isCorrect   = lFeedback && o === currentLoop.item.particle_target
                  const isWrongPick = lFeedback && isPicked && o !== currentLoop.item.particle_target
                  const cls = isCorrect   ? 'bg-emerald-500/15 ring-emerald-500/30 text-emerald-200'
                            : isWrongPick ? 'bg-red-500/15 ring-red-500/30 text-red-200 animate-shake'
                            : 'bg-white/[0.04] ring-white/10 text-white/80 hover:bg-white/[0.08]'
                  return (
                    <button
                      key={o}
                      disabled={!!lFeedback}
                      onClick={() => loopPick(o)}
                      className={`rounded-xl px-4 py-3 text-lg font-black ring-1 transition ${cls}`}
                    >{o}</button>
                  )
                })}
              </div>

              {lFeedback === 'ok' && (
                <>
                  <div className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                    ✓ Correct!
                  </div>
                  <button onClick={loopNext} className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-black text-black hover:bg-yellow-400">
                    Next
                  </button>
                </>
              )}
            </div>
          ) : (
            <StageComplete label="Heavy Loop cleared!" next={() => setPhase('loop_done')} />
          )}
        </>
      )}

      {phase === 'loop_done' && (
        <StageComplete label="Loop cleared!" next={() => setPhase('beast')} />
      )}

      {/* ── BEAST MODE ── */}
      {phase === 'beast' && currentBeast && (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <PhasePill phase="beast" />
            <span className="text-xs font-bold text-white/30">{beIdx + 1} / {beastItems.length}</span>
          </div>
          <p className="text-xs font-bold text-red-400/60 uppercase tracking-wider">No hints. Build it from memory.</p>
          <BlockAssembly key={`beast-${currentBeast.id}`} item={currentBeast} showHints={false} onPass={beastPass} />
        </div>
      )}

      {/* ── EMPTY ── */}
      {phase === 'empty' && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-14 text-center ring-1 ring-white/10 space-y-3">
          <div className="text-4xl">📭</div>
          <p className="text-xl font-black text-white">No quiz content yet</p>
          <p className="text-sm text-white/40">Quiz questions for this unit haven't been added yet. Ask your teacher or check back later.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-xl bg-white/10 px-8 py-3 text-sm font-black text-white hover:bg-white/20"
          >
            Back to Unit
          </button>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-14 text-center ring-1 ring-white/10 space-y-3">
          <div className="text-4xl">🏆</div>
          <p className="text-xl font-black text-white">All stages cleared!</p>
          <p className="text-sm text-white/40">Your grammar sensor is now calibrated.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-xl bg-yellow-500 px-8 py-3 text-sm font-black text-black hover:bg-yellow-400"
          >
            Back to Unit
          </button>
        </div>
      )}
    </div>
  )
}
