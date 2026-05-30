import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Blocks, Brain, Link2, Dumbbell } from 'lucide-react'

import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

type PakkaItem = {
  id: number
  step_type: 1 | 2 | 3 | 4
  logic_formula: string
  english_prompt: string
  correct_sentence: string
  word_blocks: string[]
  particle_target: string
  distractors?: string[]
  explanation_hint: string
  order: number
}

type UnitInfo = {
  id: number
  unit_number: number
  name: string
  level: string
}

type SessionResponse = {
  unit: UnitInfo
  exam: string
  exam_code?: string
  items: PakkaItem[]
}

type Phase = 'blueprint' | 'builder' | 'heavy' | 'beast' | 'done'

function normalizeJa(s: string): string {
  return (s ?? '').replace(/\s+/g, '')
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function isVerbLike(block: string): boolean {
  const b = (block ?? '').trim()
  if (!b) return false
  if (b === 'です' || b === 'でした' || b === 'だ' || b === 'だった') return true
  if (b.includes('じゃありません')) return true
  if (b.endsWith('ません') || b.endsWith('ませんでした')) return true
  if (b.endsWith('ですか') || b === 'か') return true
  return false
}

function buildMissingParticleSentence(sentence: string, particle: string): string {
  const s = sentence ?? ''
  const p = (particle ?? '').trim()
  if (!p) return s
  const idx = s.indexOf(p)
  if (idx === -1) return s
  return s.slice(0, idx) + '___' + s.slice(idx + p.length)
}

function particleOptions(target: string): string[] {
  const t = (target ?? '').trim()
  const particles = ['は', 'が', 'を', 'に', 'も', 'で', 'へ', 'と', 'の', 'か']
  const endings = ['です', 'じゃありません', 'でした', 'ですか', 'だ']

  const base = particles.includes(t) ? particles : endings
  const pool = base.filter((p) => p !== t)
  const opts = [t, pool[0], pool[1], pool[2]].filter(Boolean) as string[]
  return Array.from(new Set(opts)).slice(0, 4)
}

function contrastTip(correct: string, picked: string): string {
  if (picked === 'を' && (correct === 'は' || correct === 'が')) {
    return "You use を for DOING actions (eat/see), but は/が for BEING/description."
  }
  if ((picked === 'は' || picked === 'が') && correct === 'を') {
    return "You use を to mark the object of an action (eat/see)."
  }
  if (picked === 'に' && (correct === 'は' || correct === 'が')) {
    return "に often marks time/location/target; は/が marks the topic/subject."
  }
  return ''
}

function FormulaBlocks({ formula }: { formula: string }) {
  const parts = useMemo(() => (formula ?? '').split(/\s+/).filter(Boolean), [formula])
  const particleSet = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'も', 'と', 'の', 'か', 'や'])

  return (
    <div className="flex flex-wrap gap-2">
      {parts.map((p, idx) => {
        const isN1 = p.includes('N1') || p.includes('[N1]')
        const isN2 = p.includes('N2') || p.includes('[N2]')
        const isParticle = particleSet.has(p)
        const isVerb = isVerbLike(p)

        const cls = isN1
          ? 'bg-sky-500/20 text-sky-200 ring-sky-500/40'
          : isN2
            ? 'bg-orange-500/20 text-orange-200 ring-orange-500/40'
            : isVerb
              ? 'bg-red-500/20 text-red-200 ring-red-500/40'
              : isParticle
                ? 'bg-white/10 text-white/70 ring-white/20'
                : 'bg-white/[0.04] text-white/80 ring-white/10'

        return (
          <span
            key={`${p}-${idx}`}
            className={`rounded-lg px-3 py-1 text-sm font-bold ring-1 ${cls}`}
          >
            {p}
          </span>
        )
      })}
    </div>
  )
}

export function GrammarPakka() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { state } = useAuth()
  const [params] = useSearchParams()
  const examCode = (params.get('exam_code') || '').toUpperCase()

  const [unit, setUnit] = useState<UnitInfo | null>(null)
  const [items, setItems] = useState<PakkaItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>('blueprint')

  const blueprint = useMemo(() => items.filter((x) => x.step_type === 1), [items])
  const builder = useMemo(() => items.filter((x) => x.step_type === 2), [items])
  const heavy = useMemo(() => items.filter((x) => x.step_type === 3), [items])
  const beast = useMemo(() => items.filter((x) => x.step_type === 4), [items])

  const [bpIndex, setBpIndex] = useState(0)
  const [builderIndex, setBuilderIndex] = useState(0)
  const [builtCorrectCount, setBuiltCorrectCount] = useState(0)

  const [tray, setTray] = useState<string[]>([])
  const [sentence, setSentence] = useState<string[]>([])
  const [builderTip, setBuilderTip] = useState<string | null>(null)

  const [heavyQueue, setHeavyQueue] = useState<PakkaItem[]>([])
  const [heavyStreaks, setHeavyStreaks] = useState<Record<number, number>>({})
  const [heavyTip, setHeavyTip] = useState<string | null>(null)
  const [heavyPicked, setHeavyPicked] = useState<string | null>(null)
  const [heavyCorrect, setHeavyCorrect] = useState<boolean | null>(null)

  const [beastIndex, setBeastIndex] = useState(0)
  const [beastAnswer, setBeastAnswer] = useState('')
  const [beastFeedback, setBeastFeedback] = useState<'ok' | 'no' | null>(null)

  const theme = (state?.user?.growth_theme as string) ?? 'bodybuilder'

  const load = useCallback(() => {
    if (!unitId) return
    const parts: string[] = []
    if (examCode) parts.push(`exam_code=${encodeURIComponent(examCode)}`)
    const qs = parts.length ? `?${parts.join('&')}` : ''
    apiFetch<SessionResponse>(`/api/course/unit/${unitId}/grammar-pakka/${qs}`)
      .then((r) => {
        setUnit(r.unit)
        setItems(r.items)
        setError(null)
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load grammar practice'))
  }, [unitId, examCode])

  useEffect(() => { load() }, [load])

  // Initialize builder tray when entering builder or switching prompt.
  useEffect(() => {
    if (phase !== 'builder') return
    const item = builder[builderIndex]
    if (!item) return
    setTray(shuffled(item.word_blocks || []))
    setSentence([])
    setBuilderTip(null)
  }, [phase, builder, builderIndex])

  // Initialize heavy queue once (when entering heavy).
  useEffect(() => {
    if (phase !== 'heavy') return
    if (heavyQueue.length > 0) return
    setHeavyQueue(heavy)
  }, [phase, heavy, heavyQueue.length])

  function goNextPhaseFromBlueprint() {
    if (builder.length > 0) setPhase('builder')
    else if (heavy.length > 0) setPhase('heavy')
    else if (beast.length > 0) setPhase('beast')
    else setPhase('done')
  }

  function handleBlueprintUnderstand() {
    if (bpIndex < blueprint.length - 1) {
      setBpIndex((n) => n + 1)
      return
    }
    goNextPhaseFromBlueprint()
  }

  function onDragStartBlock(e: React.DragEvent, block: string) {
    e.dataTransfer.setData('text/plain', block)
  }

  function onDropToSentence(e: React.DragEvent) {
    e.preventDefault()
    const block = e.dataTransfer.getData('text/plain')
    if (!block) return

    // If a verb is already placed, disallow adding after it.
    if (sentence.length > 0 && isVerbLike(sentence[sentence.length - 1])) {
      setBuilderTip('In Japanese, the action (Verb) always comes at the end!')
      return
    }

    setBuilderTip(null)
    setSentence((prev) => [...prev, block])
    setTray((prev) => {
      const idx = prev.indexOf(block)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function removeFromSentence(block: string, idx: number) {
    setSentence((prev) => prev.filter((_, i) => i !== idx))
    setTray((prev) => [...prev, block])
    setBuilderTip(null)
  }

  function checkBuiltSentence() {
    const item = builder[builderIndex]
    if (!item) return

    const built = normalizeJa(sentence.join(''))
    const correct = normalizeJa(item.correct_sentence)

    if (!built) {
      setBuilderTip('Drag the blocks to build the sentence.')
      return
    }

    // Verb rule: last block should look like verb/copoly/question marker.
    if (!isVerbLike(sentence[sentence.length - 1])) {
      setBuilderTip('In Japanese, the action (Verb) always comes at the end!')
      return
    }

    if (built === correct) {
      setBuiltCorrectCount((n) => n + 1)
      setBuilderTip(null)

      // After 5 correct builds, move to Heavy Loop.
      const nextCount = builtCorrectCount + 1
      if (nextCount >= 5 && heavy.length > 0) {
        setPhase('heavy')
        return
      }

      if (builderIndex < builder.length - 1) {
        setBuilderIndex((n) => n + 1)
      } else {
        setPhase(heavy.length > 0 ? 'heavy' : (beast.length > 0 ? 'beast' : 'done'))
      }
    } else {
      setBuilderTip(item.explanation_hint || 'Try again. Focus on the particle links and the verb at the end.')
    }
  }

  function answerHeavy(particle: string) {
    const current = heavyQueue[0]
    if (!current) return

    const correct = (current.particle_target || '').trim()
    const ok = particle === correct

    setHeavyPicked(particle)
    setHeavyCorrect(ok)

    if (ok) {
      setHeavyTip(null)
      setHeavyStreaks((prev) => ({
        ...prev,
        [current.id]: (prev[current.id] ?? 0) + 1,
      }))
    } else {
      const extra = contrastTip(correct, particle)
      setHeavyTip([current.explanation_hint, extra].filter(Boolean).join(' '))
      setHeavyStreaks((prev) => ({ ...prev, [current.id]: 0 }))
    }
  }

  function continueHeavy() {
    const current = heavyQueue[0]
    if (!current) return

    const ok = heavyCorrect === true
    const rest = heavyQueue.slice(1)

    // Heavy loop rule: if wrong, reinsert after 2 questions.
    if (!ok) {
      const insertAt = Math.min(2, rest.length)
      const nextQ = [...rest]
      nextQ.splice(insertAt, 0, current)
      setHeavyQueue(nextQ)
    } else {
      // If this item has 3 correct in a row, consider it cleared.
      const streak = (heavyStreaks[current.id] ?? 0)
      const cleared = streak >= 3
      if (cleared) {
        setHeavyQueue(rest)
      } else {
        setHeavyQueue([...rest, current])
      }
    }

    setHeavyPicked(null)
    setHeavyCorrect(null)

    // Completion check
    const remainingIds = new Set((ok ? rest : heavyQueue).map((x) => x.id))
    const allCleared = heavy.every((it) => (heavyStreaks[it.id] ?? 0) >= 3) && remainingIds.size === 0

    if (allCleared) {
      setPhase(beast.length > 0 ? 'beast' : 'done')
    }
  }

  function submitBeast() {
    const item = beast[beastIndex]
    if (!item) return

    const ok = normalizeJa(beastAnswer) === normalizeJa(item.correct_sentence)
    setBeastFeedback(ok ? 'ok' : 'no')

    if (!ok) return

    setBeastAnswer('')
    setBeastFeedback(null)

    if (beastIndex < beast.length - 1) setBeastIndex((n) => n + 1)
    else setPhase('done')
  }

  const headerTag = phase === 'blueprint'
    ? { icon: <Brain className="h-4 w-4" />, label: 'Blueprint' }
    : phase === 'builder'
      ? { icon: <Blocks className="h-4 w-4" />, label: 'Construction' }
      : phase === 'heavy'
        ? { icon: <Link2 className="h-4 w-4" />, label: 'Particle Gauntlet' }
        : phase === 'beast'
          ? { icon: <Dumbbell className="h-4 w-4" />, label: 'Beast Mode' }
          : { icon: <Dumbbell className="h-4 w-4" />, label: 'Evolution' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            {headerTag.icon}
            {unit?.level} - {unit?.name} · {headerTag.label}
          </div>

          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Grammar Pakka</h2>
          <p className="mt-2 text-base text-white/50">
            Build the logic. Construct the sentence. Master the particle link.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Phase: Blueprint */}
      {phase === 'blueprint' && (
        <div className="space-y-4">
          {blueprint.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <p className="text-white/70">No Blueprint items found for this unit.</p>
              <button
                onClick={() => goNextPhaseFromBlueprint()}
                className="mt-4 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
              >
                Continue
              </button>
            </div>
          ) : (
            (() => {
              const item = blueprint[bpIndex]
              return (
                <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Logic Map</p>
                    <FormulaBlocks formula={item.logic_formula} />
                    <p className="text-sm text-white/40">Blue = Subject, Orange = Object, Red = Verb, Grey = Particle links.</p>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <p className="text-sm font-bold text-white/70">English</p>
                    <p className="mt-1 text-lg font-black text-white">{item.english_prompt}</p>

                    <p className="mt-4 text-sm font-bold text-white/70">Japanese</p>
                    <p className="mt-1 text-lg font-black text-white">{item.correct_sentence}</p>
                  </div>

                  <button
                    onClick={handleBlueprintUnderstand}
                    className="w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black"
                  >
                    I understand
                  </button>

                  <p className="text-center text-xs text-white/30">
                    {bpIndex + 1} / {blueprint.length}
                  </p>
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Phase: Builder */}
      {phase === 'builder' && (
        <div className="space-y-4">
          {builder.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <p className="text-white/70">No Builder items found for this unit.</p>
              <button
                onClick={() => setPhase(heavy.length > 0 ? 'heavy' : (beast.length > 0 ? 'beast' : 'done'))}
                className="mt-4 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
              >
                Continue
              </button>
            </div>
          ) : (
            (() => {
              const item = builder[builderIndex]
              return (
                <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
                  <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <p className="text-sm font-bold text-white/70">Build this sentence</p>
                    <p className="mt-1 text-lg font-black text-white">{item.english_prompt}</p>
                  </div>

                  <div
                    className="min-h-[72px] rounded-xl bg-black/20 p-4 ring-1 ring-white/10"
                    onDragOver={onDragOver}
                    onDrop={onDropToSentence}
                  >
                    {sentence.length === 0 ? (
                      <p className="text-sm text-white/30">Drag blocks here…</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sentence.map((b, idx) => (
                          <button
                            key={`${b}-${idx}`}
                            onClick={() => removeFromSentence(b, idx)}
                            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white ring-1 ring-white/15"
                            title="Tap to remove"
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {builderTip && (
                    <div className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/70 ring-1 ring-white/10">
                      {builderTip}
                    </div>
                  )}

                  <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Magnet blocks</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tray.map((b, idx) => (
                        <div
                          key={`${b}-${idx}`}
                          draggable
                          onDragStart={(e) => onDragStartBlock(e, b)}
                          className="cursor-grab rounded-lg bg-white/[0.06] px-3 py-2 text-sm font-black text-white ring-1 ring-white/10 active:cursor-grabbing"
                        >
                          {b}
                        </div>
                      ))}
                      {tray.length === 0 && (
                        <p className="text-sm text-white/30">No blocks left in tray.</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={checkBuiltSentence}
                    className="w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black"
                  >
                    Check
                  </button>

                  <p className="text-center text-xs text-white/30">
                    Built correctly: {builtCorrectCount} / 5
                  </p>
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Phase: Heavy Loop */}
      {phase === 'heavy' && (
        <div className="space-y-4">
          {heavy.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <p className="text-white/70">No Heavy Loop items found for this unit.</p>
              <button
                onClick={() => setPhase(beast.length > 0 ? 'beast' : 'done')}
                className="mt-4 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
              >
                Continue
              </button>
            </div>
          ) : (
            (() => {
              const current = heavyQueue[0]
              if (!current) {
                return (
                  <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
                    <p className="text-white/70">Gauntlet complete.</p>
                    <button
                      onClick={() => setPhase(beast.length > 0 ? 'beast' : 'done')}
                      className="mt-4 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
                    >
                      Continue
                    </button>
                  </div>
                )
              }

              const missing = buildMissingParticleSentence(current.correct_sentence, current.particle_target)
              const target = (current.particle_target || '').trim()
              const dist = (current.distractors || []).map((x) => (x || '').trim()).filter(Boolean)
              const opts = dist.length > 0 && target
                ? shuffled([target, ...dist]).slice(0, 4)
                : particleOptions(target)

              return (
                <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
                  <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <p className="text-sm font-bold text-white/70">Missing link</p>
                    <p className="mt-1 text-lg font-black text-white">{missing}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {opts.map((p) => {
                      const disabled = heavyCorrect !== null
                      const active = heavyPicked === p
                      return (
                        <button
                          key={p}
                          disabled={disabled}
                          onClick={() => answerHeavy(p)}
                          className={`rounded-xl px-4 py-3 text-base font-black ring-1 transition-all ${
                            active ? 'bg-white/10 text-white ring-white/30' : 'bg-white/[0.03] text-white/80 ring-white/10 hover:bg-white/[0.06]'
                          } ${disabled ? 'opacity-60' : ''}`}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>

                  {heavyCorrect !== null && (
                    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${
                      heavyCorrect ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/20' : 'bg-red-500/10 text-red-200 ring-red-500/20'
                    }`}>
                      {heavyCorrect ? 'Correct.' : (heavyTip || 'Not quite.')} 
                    </div>
                  )}

                  {heavyCorrect !== null && (
                    <button
                      onClick={continueHeavy}
                      className="w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black"
                    >
                      Continue
                    </button>
                  )}

                  <p className="text-center text-xs text-white/30">
                    Get each point right 3 times in a row.
                  </p>
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Phase: Beast Mode */}
      {phase === 'beast' && (
        <div className="space-y-4">
          {beast.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <p className="text-white/70">No Beast Mode items found for this unit.</p>
              <button
                onClick={() => setPhase('done')}
                className="mt-4 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
              >
                Finish
              </button>
            </div>
          ) : (
            (() => {
              const item = beast[beastIndex]
              return (
                <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8 space-y-4">
                  <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <p className="text-sm font-bold text-white/70">Recall (no hints)</p>
                    <p className="mt-1 text-lg font-black text-white">{item.english_prompt}</p>
                  </div>

                  <input
                    value={beastAnswer}
                    onChange={(e) => setBeastAnswer(e.target.value)}
                    placeholder="Type the Japanese sentence"
                    className="w-full rounded-xl bg-black/20 px-4 py-3 text-base font-semibold text-white ring-1 ring-white/10 placeholder:text-white/30"
                  />

                  {beastFeedback && (
                    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${
                      beastFeedback === 'ok' ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/20' : 'bg-red-500/10 text-red-200 ring-red-500/20'
                    }`}>
                      {beastFeedback === 'ok' ? 'Correct.' : 'Not quite. Try again.'}
                    </div>
                  )}

                  <button
                    onClick={submitBeast}
                    className="w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black"
                  >
                    Submit
                  </button>

                  <p className="text-center text-xs text-white/30">
                    {beastIndex + 1} / {beast.length}
                  </p>
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Phase: Done */}
      {phase === 'done' && (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Evolution</p>
          <h3 className="mt-2 text-2xl font-black text-white">Pakka.</h3>
          <p className="mt-2 text-white/60">
            {theme === 'bodybuilder'
              ? 'Grammar is power — plate added to the barbell.'
              : theme === 'tree'
                ? 'Grammar is structure — the tree stands taller and sturdier.'
                : 'Grammar is infrastructure — the city lights stay on.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
