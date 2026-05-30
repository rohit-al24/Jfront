import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { apiFetch, ensureCsrfCookie } from '../../api'
import { useAuth } from '../../auth'

type QuizQuestion = {
  id: number
  prompt: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
}

type DailyTaskPayload = {
  date: string
  target: number
  answered: number
  remaining: number
  rewarded: boolean
}

type WeekQuizPayload = {
  date: string
  questions: QuizQuestion[]
  mode?: 'retake'
}

type StreakInfo = {
  accuracy_percent: number
  required_percent: number
  eligible: boolean
  awarded: boolean
}

type AnswerPopup =
  | null
  | {
      kind: 'correct' | 'wrong'
      message: string
      delaySeconds: number
    }

export function QuizSession() {
  const navigate = useNavigate()
  const params = useParams<{ mode: string }>()
  const { state } = useAuth()

  const isPaid = state?.user?.subscription_status === 'paid'
  const retestPriceLabel = '₹10'

  const mode = (params.mode || 'today').toLowerCase() as 'today' | 'retake'
  const quizEndpoint = mode === 'retake' ? '/api/week/current/quiz/retake/' : '/api/week/current/quiz/'

  const [step, setStep] = useState<'warning' | 'quiz'>('warning')
  const [task, setTask] = useState<DailyTaskPayload | null>(null)
  const [quiz, setQuiz] = useState<WeekQuizPayload | null>(null)
  const [answers, setAnswers] = useState<Record<number, boolean | null>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [streak, setStreak] = useState<StreakInfo | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [popup, setPopup] = useState<AnswerPopup>(null)
  const [cardFading, setCardFading] = useState(false)

  const advanceTimerRef = useRef<number | null>(null)

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const quizQuestions = quiz?.questions ?? []
  const totalQuestions = quizQuestions.length
  const currentQuestion = totalQuestions ? quizQuestions[Math.min(activeIndex, totalQuestions - 1)] : null
  const currentAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false

  const accuracyOk = streak ? streak.eligible : null
  const needsRetest = Boolean(task && task.remaining === 0 && accuracyOk === false)

  // Block selection/copy/context menu in this session page.
  useEffect(() => {
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const stopKey = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && ['c', 'x', 'a', 's', 'p', 'u'].includes(key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('copy', stop)
    document.addEventListener('cut', stop)
    document.addEventListener('contextmenu', stop)
    document.addEventListener('keydown', stopKey, true)

    return () => {
      document.removeEventListener('copy', stop)
      document.removeEventListener('cut', stop)
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('keydown', stopKey, true)
    }
  }, [])

  useEffect(() => {
    apiFetch<DailyTaskPayload>('/api/daily-task/').then(setTask).catch(() => null)
  }, [])

  async function loadQuiz() {
    setStatus(null)

    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }

    if (mode === 'retake' && !isPaid) {
      navigate('/app/shop')
      return
    }

    try {
      const data = await apiFetch<WeekQuizPayload>(quizEndpoint)
      setQuiz(data)
      setAnswers({})
      setSelectedOptions({})
      setActiveIndex(0)
      setStreak(null)
      setCardFading(false)
      setStep('quiz')
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load quiz'
      setStatus(msg)
      // If backend returns 402, apiFetch likely throws a message; route to shop for retake.
      if (mode === 'retake') navigate('/app/shop')
    }
  }

  async function submitAnswer(questionId: number, selected: 'A' | 'B' | 'C' | 'D') {
    if (answers[questionId] !== undefined) return

    // Immediately mark as answered to disable all buttons
    setAnswers((prev) => ({ ...prev, [questionId]: null }))
    setSelectedOptions((prev) => ({ ...prev, [questionId]: selected }))

    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }

    setStatus(null)
    try {
      await ensureCsrfCookie()
      const res = await apiFetch<{
        correct: boolean
        task?: { target: number; answered: number; remaining: number; rewarded: boolean }
        streak?: StreakInfo
        already_answered?: boolean
        correct_answer?: 'A' | 'B' | 'C' | 'D'
        correct_text?: string | null
      }>('/api/submit-mondai-answer/', { method: 'POST', json: { question_id: questionId, selected } })

      setAnswers((prev) => ({ ...prev, [questionId]: res.correct }))
      if (res.task) {
        setTask({
          date: todayIso,
          target: res.task.target,
          answered: res.task.answered,
          remaining: res.task.remaining,
          rewarded: res.task.rewarded,
        })
      }
      if (res.streak) setStreak(res.streak)

      if (!res.correct) {
        const correctText = (res.correct_text ?? '').toString().trim()
        setPopup({ 
          kind: 'wrong', 
          message: correctText ? `Wrong answer. The correct answer is: ${correctText}` : 'Wrong answer.', 
          delaySeconds: 5 
        })
      } else {
        setPopup({ 
          kind: 'correct', 
          message: 'Correct!', 
          delaySeconds: 3 
        })
      }

      const delayMs = res.correct ? 3000 : 5000
      advanceTimerRef.current = window.setTimeout(() => {
        // Fade out current question
        setCardFading(true)
        
        // Wait for fade animation, then advance
        setTimeout(() => {
          setPopup(null)
          setActiveIndex((i) => {
            if (totalQuestions <= 0) return i
            if (i >= totalQuestions - 1) return i
            return i + 1
          })
          setCardFading(false)
        }, 200)
        
        advanceTimerRef.current = null
      }, delayMs)
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to submit answer')
    }
  }

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
    }
  }, [])

  return (
    <div className="space-y-6 select-none">
      {popup ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className={[
              'w-[calc(100%-2rem)] max-w-2xl rounded-3xl px-10 py-8 shadow-2xl transform animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300',
              popup.kind === 'correct' 
                ? 'border-4 border-emerald-400/60 bg-emerald-950/95 text-emerald-50 shadow-[0_0_60px_rgba(52,211,153,0.4)]'
                : 'border-4 border-red-400/60 bg-red-950/95 text-red-50 shadow-[0_0_60px_rgba(239,68,68,0.4)]'
            ].join(' ')}
          >
            <div className="flex items-center gap-4">
              <span className="text-5xl">{popup.kind === 'correct' ? '✓' : '✗'}</span>
              <div className="flex-1">
                <div className="font-black text-3xl">{popup.kind === 'correct' ? 'Correct Answer!' : 'Wrong Answer!'}</div>
                {popup.kind === 'wrong' && popup.message.includes('correct answer is:') ? (
                  <div className="mt-3 text-xl font-semibold opacity-90">
                    <span className="text-white/60">Correct answer: </span>
                    <span className="text-white">{popup.message.split('correct answer is:')[1]?.trim()}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={popup.kind === 'correct' ? 'mt-6 text-lg font-bold text-emerald-300/80' : 'mt-6 text-lg font-bold text-red-300/80'}>
              Auto-advancing in {popup.delaySeconds} seconds...
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Quiz Session</div>
            <div className="mt-2 text-3xl font-black text-white">{mode === 'retake' ? `Re-test (${retestPriceLabel})` : 'Today’s Quiz'}</div>
            <div className="mt-2 text-base text-white/40">Sliding cards · Immediate result</div>
          </div>
          <button
            onClick={() => navigate('/app/quiz')}
            className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            Exit
          </button>
        </div>

        {task ? (
          <div className="mt-6 rounded-2xl bg-black/20 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-white">Daily Task</div>
              <div className="text-base font-black text-yellow-400">{task.answered}/{task.target}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-yellow-500"
                style={{ width: `${Math.min(100, Math.round((task.answered / Math.max(1, task.target)) * 100))}%` }}
              />
            </div>
            <div className="mt-2 text-base text-white/40">
              {task.rewarded ? 'Completed for today.' : `${task.remaining} remaining to earn today’s reward.`}
            </div>
          </div>
        ) : null}

        {needsRetest ? (
          <div className="mt-4 rounded-2xl bg-red-600/10 p-4 text-base font-semibold text-red-200 ring-1 ring-red-500/20">
            You need at least {streak?.required_percent ?? 75}% accuracy to earn today’s streak. Re-test costs {retestPriceLabel}.
          </div>
        ) : task && task.remaining === 0 && accuracyOk === true ? (
          <div className="mt-4 rounded-2xl bg-emerald-600/10 p-4 text-base font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
            Streak earned{streak?.accuracy_percent !== undefined ? ` — Accuracy ${streak.accuracy_percent}%` : ''}.
          </div>
        ) : null}

        {status ? (
          <div className="mt-4 rounded-2xl bg-red-600/10 p-4 text-base font-semibold text-red-200 ring-1 ring-red-500/20">{status}</div>
        ) : null}
      </div>

      {step === 'warning' ? (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
          <div className="text-sm font-black uppercase tracking-widest text-white/40">Warning</div>
          <div className="mt-2 text-2xl font-black text-white">Read before you continue</div>
          <div className="mt-3 space-y-2 text-base text-white/60">
            <div>• Do not refresh or exit while attempting.</div>
            <div>• Copying/selection is disabled in this quiz view.</div>
            <div>• You only earn a streak when your accuracy is at least 75%.</div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={loadQuiz}
              className="rounded-xl bg-yellow-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-400"
            >
              Continue
            </button>
            <button
              onClick={() => navigate('/app/quiz')}
              className="rounded-xl bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === 'quiz' ? (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
          {currentQuestion ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-black uppercase tracking-widest text-white/40">
                  Question {Math.min(activeIndex + 1, totalQuestions)} / {totalQuestions}
                </div>
                {streak ? <div className="text-sm font-bold text-white/50">Accuracy: {streak.accuracy_percent}%</div> : null}
              </div>

              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${Math.min(activeIndex, totalQuestions - 1) * 100}%)` }}
                >
                  {quizQuestions.map((q) => {
                    const answered = answers[q.id] !== undefined
                    const correct = answers[q.id] === true
                    const wrong = answers[q.id] === false
                    const selectedOpt = selectedOptions[q.id]
                    return (
                      <div key={q.id} className="w-full flex-none">
                        <div 
                          className={[
                            'rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 transition-opacity duration-200',
                            cardFading ? 'opacity-0' : 'opacity-100'
                          ].join(' ')}
                        >
                          <p className="text-xl font-semibold text-white md:text-2xl">{q.prompt}</p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                              const isSelected = selectedOpt === opt
                              const isCorrectOption = correct && isSelected
                              const isWrongOption = wrong && isSelected
                              
                              return (
                                <button
                                  key={opt}
                                  disabled={answered}
                                  onClick={() => submitAnswer(q.id, opt)}
                                  className={[
                                    'flex items-center gap-3 rounded-xl px-4 py-4 text-left text-lg font-medium ring-2 transition-all duration-300',
                                    !answered
                                      ? 'bg-white/[0.04] text-white ring-white/10 hover:bg-white/10 hover:ring-yellow-500/40 active:scale-98'
                                      : isCorrectOption
                                      ? 'bg-emerald-950/40 text-emerald-100 ring-emerald-500/60 shadow-lg shadow-emerald-500/20'
                                      : isWrongOption
                                      ? 'bg-red-950/40 text-red-100 ring-red-500/60 shadow-lg shadow-red-500/20'
                                      : 'bg-white/[0.02] text-white/40 ring-white/5 cursor-not-allowed',
                                  ].join(' ')}
                                >
                                  <span 
                                    className={[
                                      'flex h-9 w-9 flex-none items-center justify-center rounded-lg text-base font-black transition-colors',
                                      isCorrectOption ? 'bg-emerald-500 text-white' : isWrongOption ? 'bg-red-500 text-white' : 'bg-white/10'
                                    ].join(' ')}
                                  >
                                    {isCorrectOption ? '✓' : isWrongOption ? '✗' : opt}
                                  </span>
                                  <span>{q.options[opt]}</span>
                                </button>
                              )
                            })}
                          </div>

                          {answered ? (
                            <div
                              className={[
                                'mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-base font-bold',
                                correct ? 'bg-emerald-950/60 text-emerald-400' : '',
                                wrong ? 'bg-red-950/60 text-red-400' : '',
                              ].join(' ')}
                            >
                              {correct ? '✓ Correct' : '✗ Incorrect'}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex <= 0}
                  className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:opacity-50"
                >
                  Prev
                </button>

                <div className="flex gap-2">
                  {needsRetest ? (
                    <button
                      onClick={() => (isPaid ? navigate('/app/quiz/session/retake') : navigate('/app/shop'))}
                      className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
                    >
                      Re-test {retestPriceLabel}
                    </button>
                  ) : null}

                  <button
                    onClick={() => setActiveIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                    disabled={!currentAnswered || activeIndex >= totalQuestions - 1}
                    className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-400 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-base text-white/50">Loading…</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
