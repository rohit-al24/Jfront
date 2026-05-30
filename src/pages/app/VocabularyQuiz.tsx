import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronLeft, CheckCircle, Volume2, XCircle, Star, Lightbulb, Zap } from 'lucide-react'
import { apiFetch } from '../../api'
import { saveUnitProgress } from '../../hooks/useUnitProgress'
import { ExitWarningDialog } from '../../components/ExitWarningDialog'

const XP_PER_CORRECT = 3   // must match backend xp_rate_map for 'vocab'

function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(523, ctx.currentTime)   // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1) // E5
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2) // G5
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch { /* ignore */ }
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

type QuizQuestion = {
  id: number
  target: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
  correct_answer: 'A' | 'B' | 'C' | 'D'
}

type UnitInfo = {
  id: number
  unit_number: number
  name: string
  level: string
}

export function VocabularyQuiz() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const [unit, setUnit] = useState<UnitInfo | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [quizComplete, setQuizComplete] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [showAppreciation, setShowAppreciation] = useState(false)

  // Hint state
  const [hintRemaining, setHintRemaining] = useState(3)
  const [hintText, setHintText] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)

  // XP result state (from save-score response)
  const [xpResult, setXpResult] = useState<{ xp_earned: number; passed_75: boolean; already_passed: boolean } | null>(null)

  // Fetch hint daily usage on mount
  useEffect(() => {
    apiFetch<{ used: number; limit: number; remaining: number }>('/api/hints/usage/today/')
      .then((r) => setHintRemaining(r.remaining))
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (!unitId) return
    apiFetch<{ unit: UnitInfo; questions: QuizQuestion[] }>(`/api/course/unit/${unitId}/vocabulary/quiz/`)
      .then((r) => {
        setUnit(r.unit)
        setQuestions(r.questions)
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load quiz'))
  }, [unitId])

  const currentQuestion = questions[currentIndex]

  // Clear hint when question changes
  useEffect(() => {
    setHintText(null)
    setHintError(null)
  }, [currentIndex])

  // Auto-speak the Japanese word when a new question appears
  const spokenIndexRef = useRef(-1)
  useEffect(() => {
    if (currentQuestion && spokenIndexRef.current !== currentIndex) {
      spokenIndexRef.current = currentIndex
      const delay = setTimeout(() => speakJa(currentQuestion.target), 400)
      return () => clearTimeout(delay)
    }
  }, [currentIndex, currentQuestion])

  async function handleUseHint() {
    if (!currentQuestion || hintLoading) return
    if (hintRemaining <= 0) {
      setHintError('Daily hint limit reached (3/day)')
      return
    }
    setHintLoading(true)
    setHintError(null)
    try {
      const data = await apiFetch<{ hint_text: string | null; has_hint: boolean; remaining: number }>(
        `/api/hints/vocab/${currentQuestion.id}/use/`
      )
      setHintRemaining(data.remaining)
      if (data.has_hint && data.hint_text) {
        setHintText(data.hint_text)
      } else {
        setHintError("You haven't added a hint for this word. Visit Study mode to add one.")
      }
    } catch (e: any) {
      if (e?.status === 429) {
        setHintError('Daily hint limit reached (3/day)')
        setHintRemaining(0)
      } else {
        setHintError('Could not load hint')
      }
    } finally {
      setHintLoading(false)
    }
  }

  const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    if (showResult || !currentQuestion) return
    
    setSelectedAnswer(answer)
    const correct = answer === currentQuestion.correct_answer
    setIsCorrect(correct)
    setShowResult(true)
    if (correct) {
      playCorrectSound()
      setShowAppreciation(true)
      setTimeout(() => setShowAppreciation(false), 1200)
    }

    const newCorrect = score.correct + (correct ? 1 : 0)
    const newTotal = score.total + 1
    setScore({ correct: newCorrect, total: newTotal })

    // Auto-advance after success (3s) or failure (5s)
    const delay = correct ? 3000 : 5000
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setSelectedAnswer(null)   // clear BEFORE index change
        setShowResult(false)
        setCurrentIndex((i) => i + 1)
      } else {
        if (unitId) saveUnitProgress(unitId, { vocabQuizScore: Math.round((newCorrect / newTotal) * 100) })
        // Save to backend
        const pct = Math.round((newCorrect / newTotal) * 100)
        apiFetch<{ xp_earned: number; passed_75: boolean; already_passed: boolean }>('/api/quiz/save-score/', {
          method: 'POST',
          json: { unit_id: parseInt(unitId!), quiz_type: 'vocab', score: newCorrect, total: newTotal, percentage: pct },
        })
          .then((r) => setXpResult({ xp_earned: r.xp_earned, passed_75: r.passed_75, already_passed: r.already_passed }))
          .catch(() => null)
        setQuizComplete(true)
      }
    }, delay)
  }

  if (quizComplete) {
    const percentage = questions.length > 0 ? Math.round((score.correct / score.total) * 100) : 0
    const potentialXp = questions.length * XP_PER_CORRECT
    
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
          <div className={`absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl ${percentage >= 80 ? 'bg-emerald-600/20' : 'bg-red-600/20'}`} />
          <div className="relative text-center">
            <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${percentage >= 80 ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'}`}>
              {percentage >= 80 ? <CheckCircle className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
            </div>
            <h2 className="text-3xl font-black text-white">Quiz Complete!</h2>
            <div className="mt-6 text-6xl font-black text-yellow-500">{percentage}%</div>
            <p className="mt-2 text-lg text-white/50">
              {score.correct} out of {score.total} correct
            </p>

            {/* XP result */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ring-1 ring-white/10 bg-white/[0.04]">
              <Zap className="h-4 w-4 text-yellow-400" />
              {xpResult === null ? (
                <span className="text-white/50">Calculating XP…</span>
              ) : xpResult.xp_earned > 0 ? (
                <span className="text-yellow-400">+{xpResult.xp_earned} XP Added!</span>
              ) : percentage >= 75 && xpResult.already_passed ? (
                <span className="text-white/50">Already earned XP for this quiz</span>
              ) : (
                <span className="text-white/40">Score 75%+ to earn up to {potentialXp} XP</span>
              )}
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  setSelectedAnswer(null)
                  setShowResult(false)
                  setScore({ correct: 0, total: 0 })
                  setQuizComplete(false)
                  setXpResult(null)
                }}
                className="rounded-xl bg-white/10 px-6 py-3 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-red-600 hover:ring-red-500"
              >
                Retake Quiz
              </button>
              <button
                onClick={() => navigate(-1)}
                className="rounded-xl bg-red-600 px-6 py-3 text-base font-bold text-white transition hover:bg-red-500"
              >
                Back to Units
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const potentialXp = questions.length * XP_PER_CORRECT

  return (
    <div className="space-y-6 relative">
      {/* Appreciation animation overlay */}
      {showAppreciation && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-8 w-8 text-yellow-400 fill-yellow-400 drop-shadow-lg" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
            <span className="text-2xl font-black text-yellow-400 drop-shadow-lg">Correct! ✨</span>
          </div>
        </div>
      )}
      {showExitWarning && (
        <ExitWarningDialog
          onStay={() => setShowExitWarning(false)}
          onLeave={() => navigate(-1)}
        />
      )}
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => score.total > 0 ? setShowExitWarning(true) : navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Units
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
                <BookOpen className="h-4 w-4" />
                {unit?.level} - {unit?.name}
              </div>
              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
                Vocabulary Quiz
              </h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-yellow-500">
                {currentIndex + 1}/{questions.length}
              </div>
              <div className="text-sm font-semibold text-white/40">Questions</div>
            </div>
          </div>
        </div>
      </div>

      {/* XP Preview Banner */}
      <div className="flex items-center gap-2 rounded-xl bg-yellow-500/[0.08] px-4 py-2.5 ring-1 ring-yellow-500/20 text-sm font-semibold text-yellow-400">
        <Zap className="h-4 w-4 shrink-0" />
        Complete with 75%+ accuracy to earn up to <span className="font-black">{potentialXp} XP</span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Question */}
      {currentQuestion && (
        <div className="rounded-2xl bg-white/[0.03] p-8 ring-1 ring-white/10">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="text-4xl font-black text-white">{currentQuestion.target}</div>
              <button
                onClick={() => speakJa(currentQuestion.target)}
                title="Listen"
                className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/[0.05] ring-1 ring-white/10 text-white/40 transition hover:bg-yellow-500/15 hover:ring-yellow-400/40 hover:text-yellow-300 hover:scale-105 active:scale-95"
              >
                <Volume2 className="h-5 w-5" />
              </button>
              {/* Hint button */}
              <button
                onClick={handleUseHint}
                disabled={hintLoading || hintRemaining <= 0}
                title={hintRemaining > 0 ? `Use hint (${hintRemaining} left today)` : 'Daily hint limit reached'}
                className={`relative inline-flex items-center justify-center h-10 w-10 rounded-xl ring-1 transition hover:scale-105 active:scale-95 ${
                  hintText
                    ? 'bg-yellow-500/25 ring-yellow-400/50 text-yellow-300'
                    : hintRemaining > 0
                    ? 'bg-white/[0.05] ring-white/10 text-white/40 hover:bg-yellow-500/15 hover:ring-yellow-400/40 hover:text-yellow-300'
                    : 'bg-white/[0.03] ring-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                <Lightbulb className="h-5 w-5" />
                {hintRemaining > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[9px] font-black text-black">
                    {hintRemaining}
                  </span>
                )}
              </button>
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-yellow-500">
              Select the correct translation
            </div>
          </div>

          {/* Hint display */}
          {(hintText || hintError) && (
            <div className={`mb-5 rounded-xl px-4 py-3 text-sm ring-1 ${
              hintError
                ? 'bg-white/[0.03] ring-white/10 text-white/40'
                : 'bg-yellow-500/10 ring-yellow-500/20 text-yellow-200'
            }`}>
              {hintText ? (
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span>{hintText}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{hintError}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {(['A', 'B', 'C', 'D'] as const).map((key) => {
              const isSelected = selectedAnswer === key
              const isCorrectOption = showResult && key === currentQuestion.correct_answer
              const isWrongSelection = showResult && isSelected && !isCorrect

              return (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  disabled={showResult}
                  className={`rounded-xl px-6 py-4 text-left text-base font-semibold ring-1 transition-all ${
                    isCorrectOption
                      ? 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/50'
                      : isWrongSelection
                      ? 'bg-red-600/20 text-red-300 ring-red-500/50'
                      : showResult
                      ? 'bg-white/[0.02] text-white/30 ring-white/5 cursor-not-allowed'
                      : 'bg-white/[0.04] text-white ring-white/10 hover:bg-white/10 hover:ring-yellow-500/40 active:scale-98'
                  }`}
                >
                  <span className="mr-3 font-black text-yellow-500">{key}.</span>
                  {currentQuestion.options[key]}
                </button>
              )
            })}
          </div>

          {/* Result Popup */}
          {showResult && (
            <div className={`mt-6 rounded-xl px-5 py-4 text-center ${isCorrect ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-300'}`}>
              <div className="flex items-center justify-center gap-2 text-lg font-bold">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Incorrect
                  </>
                )}
              </div>
              {!isCorrect && (
                <div className="mt-2 text-sm">
                  Correct answer: <span className="font-bold">{currentQuestion.options[currentQuestion.correct_answer]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {questions.length === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No quiz questions available</p>
        </div>
      )}
    </div>
  )
}
