import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Zap, RefreshCw } from 'lucide-react'

import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import { CreatureVisualizer } from '../../components/creature/CreatureVisualizer'
import type { CreatureTheme } from '../../components/creature/CreatureVisualizer'
import { ExitWarningDialog } from '../../components/ExitWarningDialog'

// ─── Types ──────────────────────────────────────────────────────────────────

type AdaptiveItem = {
  vocab_id: number
  prompt: string
  prompt_type: 'hiragana' | 'english'
  options: Record<'A' | 'B' | 'C' | 'D', string>
  correct_answer: 'A' | 'B' | 'C' | 'D'
  mode: 'normal' | 'flip' | 'speed'
  timer_seconds: number
  streak_correct: number
  lapses: number
  is_weak?: boolean
  mastered: boolean
  priority?: number
  is_surprise?: boolean
  unit_name?: string
}

type SessionPayload = {
  unit: { id: number; unit_number: number; name: string; level: string }
  exam: string
  items: AdaptiveItem[]
  surprise_review: AdaptiveItem[]
  total_vocab: number
  mastered_count: number
  mastery_percent: number
}

type SubmitResult = {
  correct: boolean
  streak_correct: number
  streak_normal: number
  lapses: number
  is_weak: boolean
  mode: string
  timer_seconds: number
  mastered: boolean
  due_at: string | null
}

// ─── Mode badge ──────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: string }) {
  if (mode === 'flip') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-bold text-violet-300 ring-1 ring-violet-500/40">
      FLIP ↔
    </span>
  )
  if (mode === 'speed') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-600/20 px-2.5 py-0.5 text-xs font-bold text-yellow-300 ring-1 ring-yellow-500/40">
      <Zap className="h-3 w-3" /> SPEED
    </span>
  )
  return null
}

// ─── Timer ring ──────────────────────────────────────────────────────────────

function TimerRing({ seconds, max }: { seconds: number; max: number }) {
  const pct = seconds / max
  const r = 20
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={52} height={52} className="rotate-[-90deg]">
      <circle cx={26} cy={26} r={r} fill="none" stroke="#ffffff18" strokeWidth={4} />
      <circle
        cx={26} cy={26} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
      />
      <text
        x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={13} fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
      >
        {seconds}
      </text>
    </svg>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'] as const

export function AdaptiveQuiz() {
  const { unitId } = useParams<{ unitId: string }>()
  const [params] = useSearchParams()
  const examCode = (params.get('exam') || '').toUpperCase()
  const navigate = useNavigate()
  const { state } = useAuth()

  const [session, setSession] = useState<SessionPayload | null>(null)
  const [queue, setQueue] = useState<AdaptiveItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Per-card state
  const [picked, setPicked] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timerLeft, setTimerLeft] = useState(10)
  const [timerMax, setTimerMax] = useState(10)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Session-level stats
  const [masteredThisSession, setMasteredThisSession] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [currentXpGain, setCurrentXpGain] = useState(0)
  const [masteryPercent, setMasteryPercent] = useState(0)
  const [growthAnim, setGrowthAnim] = useState<'success' | 'fail' | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)

  const theme: CreatureTheme = (state?.user?.growth_theme as CreatureTheme) ?? 'bodybuilder'

  // ── Load session ──────────────────────────────────────────────────────────

  const loadSession = useCallback(() => {
    if (!unitId) return
    const qs = examCode ? `?exam=${examCode}` : ''
    apiFetch<SessionPayload>(`/api/course/unit/${unitId}/adaptive-quiz/${qs}`)
      .then((data) => {
        setSession(data)
        setMasteryPercent(data.mastery_percent)
        // Build queue: main items + surprise review + re-shuffle weak at end
        const q = [...data.items, ...data.surprise_review]
        setQueue(q)
        if (q.length === 0) setSessionDone(true)
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load quiz'))
  }, [unitId, examCode])

  useEffect(() => { loadSession() }, [loadSession])

  // ── Timer ─────────────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback((seconds: number) => {
    stopTimer()
    setTimerLeft(seconds)
    setTimerMax(seconds)
    timerRef.current = setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          stopTimer()
          // Time-out counts as wrong — handle in a separate effect
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [stopTimer])

  useEffect(() => {
    if (queue.length === 0 || feedback !== null) return
    startTimer(queue[0]?.timer_seconds ?? 10)
    return stopTimer
  }, [queue, feedback, startTimer, stopTimer])

  // Auto-submit on timer expiry (timerLeft == 0 and no feedback yet)
  useEffect(() => {
    if (timerLeft === 0 && feedback === null && queue.length > 0) {
      handleAnswer(null) // treat timed-out as wrong
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerLeft])

  // ── Answer submission ─────────────────────────────────────────────────────

  async function handleAnswer(letter: 'A' | 'B' | 'C' | 'D' | null) {
    if (feedback !== null) return
    stopTimer()

    const current = queue[0]
    if (!current) return

    const isCorrect = letter !== null && letter === current.correct_answer
    setPicked(letter)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    setTotalAnswered((n) => n + 1)
    if (isCorrect) setTotalCorrect((n) => n + 1)

    // XP estimates (server awards real XP; we estimate for UI)
    const xpMap: Record<string, number> = { normal: 2, flip: 5, speed: 10 }
    const earnedXp = xpMap[current.mode] ?? 2
    if (isCorrect) {
      setXpEarned((n) => n + earnedXp)
      setCurrentXpGain(earnedXp)
    } else {
      setCurrentXpGain(0)
    }
    // Only pass 'success'/'fail' — CharacterGrowth plays correct bounce on success,
    // shake (no growth) on fail. Reset quickly so next answer can re-trigger.
    setGrowthAnim(isCorrect ? 'success' : 'fail')
    setAnimKey((k) => k + 1)
    setTimeout(() => setGrowthAnim(null), 750)

    try {
      const result: SubmitResult = await apiFetch('/api/course/vocab-state/submit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocab_id: current.vocab_id, correct: isCorrect, mode: current.mode }),
      })

      if (result.mastered) {
        setMasteredThisSession((n) => n + 1)
      }
      // Always re-fetch mastery so % reflects mode upgrades (normal→flip→speed)
      const qs = examCode ? `?exam=${examCode}` : ''
      apiFetch<{ mastery_percent: number }>(`/api/course/unit/${unitId}/mastery/${qs}`)
        .then((m) => setMasteryPercent(m.mastery_percent))
        .catch(() => null)

      // Build updated item with server's new state
      const updatedItem: AdaptiveItem = {
        ...current,
        mode: result.mode as AdaptiveItem['mode'],
        timer_seconds: result.timer_seconds,
        streak_correct: result.streak_correct,
        lapses: result.lapses,
        mastered: result.mastered,
      }

      // Advance queue
      const delay = isCorrect ? 2000 : 4000
      setTimeout(() => {
        setPicked(null)
        setFeedback(null)

        setQueue((prev) => {
          const [_, ...rest] = prev
          if (result.mastered) return rest  // remove from queue
          if (!isCorrect) {
            // Heavy Loop: re-insert wrong item 2 positions ahead
            const insertAt = Math.min(2, rest.length)
            const next = [...rest]
            next.splice(insertAt, 0, updatedItem)
            return next
          }
          return rest
        })
      }, delay)
    } catch (err: any) {
      // Still advance even if API call fails
      setTimeout(() => {
        setPicked(null)
        setFeedback(null)
        setGrowthAnim(null)
        setQueue((prev) => prev.slice(1))
      }, 2000)
    }
  }

  // Detect session end
  useEffect(() => {
    if (session && queue.length === 0 && !sessionDone && totalAnswered > 0) {
      setSessionDone(true)
    }
  }, [queue, session, sessionDone, totalAnswered])

  // ── Session complete screen ───────────────────────────────────────────────

  if (sessionDone) {
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8 text-center">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />
          <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
          <p className="text-white/50 text-sm mb-6">{session?.unit.name ?? ''}</p>

          {/* Creature Visualizer */}
          <div className="flex justify-center mb-6">
            <CreatureVisualizer theme={theme} percent={masteryPercent} size="lg" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Mastered', value: masteredThisSession, icon: '★' },
              { label: 'Accuracy', value: `${accuracy}%`, icon: '◎' },
              { label: 'XP Earned', value: `+${xpEarned}`, icon: '⚡' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 p-3">
                <div className="text-xl">{s.icon}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/40">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={loadSession}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition"
            >
              <RefreshCw className="h-4 w-4" /> Practice Again
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600/20 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-600/30 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Units
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Ready-to-Go intro screen ────────────────────────────────────────

  if (session && !quizStarted && !sessionDone) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-[#12101a] to-[#0d0d0d] p-8 ring-1 ring-white/10 text-center shadow-2xl">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
          <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-violet-600/5 blur-2xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 px-3 py-1 text-xs font-bold text-violet-300 ring-1 ring-violet-500/30 mb-4">
              <Zap className="h-3 w-3" /> PAKKA ADAPTIVE
            </span>
            <h2 className="text-2xl font-black text-white mb-1">{session.unit.name}</h2>
            <p className="text-sm text-white/40 mb-6">{session.unit.level}</p>
            <div className="flex justify-center mb-6">
              <CreatureVisualizer theme={theme} percent={masteryPercent} size="md" />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-lg font-black text-white">{session.total_vocab}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Vocab</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-lg font-black text-white">{session.mastered_count}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Mastered</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-lg font-black" style={{ color: masteryPercent > 0 ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
                  {masteryPercent}%
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Progress</div>
              </div>
            </div>
            <p className="text-xs text-white/30 mb-6 leading-relaxed">
              Correct answers upgrade: Normal → Flip → Speed → Mastered.<br />
              Your progress is saved automatically after every answer.
            </p>
            <button
              onClick={() => setQuizStarted(true)}
              className="w-full rounded-xl bg-violet-600 py-3.5 text-base font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.5)] transition hover:bg-violet-500 hover:shadow-[0_0_36px_rgba(124,58,237,0.7)] active:scale-95"
            >
              Ready to Go! ⚡
            </button>
            <button onClick={() => navigate(-1)} className="mt-3 w-full rounded-xl py-2 text-sm text-white/30 hover:text-white/60 transition">
              Back to Units
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading / error ───────────────────────────────────────────────────────

  if (error) return (
    <div className="rounded-2xl bg-red-900/20 p-6 text-red-300 ring-1 ring-red-700/40">
      <p className="font-semibold">Error</p>
      <p className="mt-1 text-sm">{error}</p>
    </div>
  )

  if (!session || queue.length === 0) return (
    <div className="flex items-center justify-center py-20 text-white/40 text-sm">
      {!session ? 'Loading…' : 'All vocabulary mastered! 🎉'}
    </div>
  )

  const current = queue[0]
  const isTimeOut = timerLeft === 0

  // ── Card ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {showExitWarning && (
        <ExitWarningDialog
          onStay={() => setShowExitWarning(false)}
          onLeave={() => navigate(-1)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setShowExitWarning(true)} className="text-white/40 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs text-white/40">{session.unit.level} · {session.unit.name}</p>
          <p className="text-xs text-white/30">{queue.length} remaining</p>
        </div>
        <div className="flex items-center gap-2">
          {current.is_surprise && (
            <span className="text-xs text-amber-400 font-bold">REVIEW</span>
          )}
          <ModeBadge mode={current.mode} />
        </div>
      </div>

      {/* Growth Visualizer - Centered on Desktop */}
      <div className="relative rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] ring-1 ring-white/10 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
          {/* Creature Visualizer */}
          <div className="flex-shrink-0">
            <CreatureVisualizer
              theme={theme}
              percent={masteryPercent}
              size="md"
              animate={growthAnim !== null}
              animType={growthAnim}
              triggerKey={animKey}
              xpGain={currentXpGain}
            />
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 md:gap-6 text-center md:text-left">
            <div>
              <p className="text-xs text-white/40 mb-1">Session</p>
              <p className="text-2xl font-bold text-white">{totalCorrect}<span className="text-white/40">/{totalAnswered}</span></p>
              <p className="text-xs text-emerald-400 mt-0.5">{totalAnswered > 0 ? Math.round((totalCorrect/totalAnswered)*100) : 0}% accuracy</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">XP Earned</p>
              <p className="text-2xl font-bold text-yellow-400">+{xpEarned}</p>
              <p className="text-xs text-white/40 mt-0.5">{masteredThisSession} mastered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className={`relative rounded-2xl p-6 ring-1 transition-all duration-300 ${
        feedback === 'correct' ? 'bg-emerald-900/30 ring-emerald-600/40' :
        feedback === 'wrong' ? 'bg-red-900/30 ring-red-600/40' :
        'bg-[#16181f] ring-white/10'
      }`}>
        {/* Timer */}
        <div className="absolute right-4 top-4">
          <TimerRing seconds={timerLeft} max={timerMax} />
        </div>

        {/* Prompt label */}
        <p className="text-xs text-white/30 mb-1">
          {current.prompt_type === 'english' ? 'English → Japanese' : 'Japanese → English'}
        </p>

        {/* Main prompt */}
        <p className="text-3xl font-bold text-white leading-tight mb-6 pr-14">
          {current.prompt}
        </p>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-3">
          {ANSWER_LETTERS.map((letter) => {
            const val = current.options[letter]
            const isChosen = picked === letter
            const isCorrectLetter = letter === current.correct_answer
            let cls = 'rounded-xl px-3 py-3 text-sm font-semibold text-left transition-all ring-1 '

            if (feedback === null && !isTimeOut) {
              cls += 'bg-white/5 ring-white/10 hover:bg-white/10 hover:ring-white/20 active:scale-95 cursor-pointer text-white'
            } else if (isCorrectLetter) {
              cls += 'bg-emerald-600/30 ring-emerald-500/50 text-emerald-200'
            } else if (isChosen && !isCorrectLetter) {
              cls += 'bg-red-600/30 ring-red-500/50 text-red-200'
            } else {
              cls += 'bg-white/5 ring-white/5 text-white/30 cursor-default'
            }

            return (
              <button
                key={letter}
                className={cls}
                onClick={() => {
                  if (feedback !== null || isTimeOut) return
                  handleAnswer(letter)
                }}
                disabled={feedback !== null || isTimeOut}
              >
                <span className="mr-2 text-xs opacity-60">{letter}.</span>
                {val}
              </button>
            )
          })}
        </div>

        {/* Timed-out message */}
        {isTimeOut && feedback === null && (
          <p className="mt-3 text-center text-xs text-red-400 animate-pulse">Time's up!</p>
        )}
      </div>

      {/* Queue preview dots */}
      <div className="flex justify-center gap-1">
        {queue.slice(0, Math.min(10, queue.length)).map((item, i) => (
          <div
            key={`${item.vocab_id}-${i}`}
            className={`h-1.5 rounded-full transition-all ${
              i === 0 ? 'w-4 bg-white/60' :
              item.is_weak ? 'w-1.5 bg-red-500/60' :
              item.mastered ? 'w-1.5 bg-emerald-500/60' :
              'w-1.5 bg-white/20'
            }`}
          />
        ))}
        {queue.length > 10 && (
          <span className="text-white/20 text-xs self-center">+{queue.length - 10}</span>
        )}
      </div>
    </div>
  )
}
