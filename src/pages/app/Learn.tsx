import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Play, CheckCircle, Lock, ChevronRight, Zap } from 'lucide-react'

import { apiFetch, apiUrl, ensureCsrfCookie } from '../../api'
import { CelebrationModal } from '../../components/CelebrationModal'

type PathNode = { weekly_content_id: number; week_number: number; status: 'completed' | 'active' | 'locked' }

type PathPayload = {
  level: 'N5' | 'N4'
  progress_percent: number
  nodes: PathNode[]
}

type QuizQuestion = {
  id: number
  prompt: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
}

type DailyQuizPayload = {
  week: { weekly_content_id: number; level: 'N5' | 'N4'; week_number: number }
  questions: QuizQuestion[]
}

type FixedWeekPayload = {
  date: string
  week: { start: string | null; end: string | null }
  mondais: { public_id: string; name: string; question_count: number }[]
}

type DailyTaskPayload = {
  date: string
  target: number
  answered: number
  remaining: number
  rewarded: boolean
}

export function Learn() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [path, setPath] = useState<PathPayload | null>(null)
  const [quiz, setQuiz] = useState<DailyQuizPayload | null>(null)
  const [answers, setAnswers] = useState<Record<number, boolean | null>>({})
  const [status, setStatus] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  const [fixedWeek, setFixedWeek] = useState<FixedWeekPayload | null>(null)
  const [task, setTask] = useState<DailyTaskPayload | null>(null)

  // Detect post-payment celebration flag
  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      setShowCelebration(true)
      // Remove the flag from URL without adding a history entry
      setSearchParams((prev) => {
        prev.delete('subscribed')
        return prev
      }, { replace: true })
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiFetch<PathPayload>('/api/path/')
      .then(setPath)
      .catch((e: any) => setStatus(e?.message ?? 'Failed to load path'))
  }, [])

  useEffect(() => {
    apiFetch<FixedWeekPayload>('/api/week/current/')
      .then(setFixedWeek)
      .catch((e: any) => setStatus(e?.message ?? 'Failed to load fixed week'))
    apiFetch<DailyTaskPayload>('/api/daily-task/')
      .then(setTask)
      .catch((e: any) => setStatus(e?.message ?? 'Failed to load daily task'))
  }, [])

  const activeNode = useMemo(() => path?.nodes?.find((n) => n.status === 'active') ?? null, [path])

  async function startDailyQuiz() {
    setStatus(null)
    try {
      const data = await apiFetch<DailyQuizPayload>('/api/daily-quiz/')
      setQuiz(data)
      setAnswers({})
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to fetch daily quiz')
    }
  }

  function goToTodayQuiz() {
    navigate('/app/quiz/session/today')
  }

  async function submitAnswer(questionId: number, selected: 'A' | 'B' | 'C' | 'D') {
    if (answers[questionId] !== undefined) return
    setStatus(null)
    try {
      const res = await apiFetch<{ correct: boolean }>('/api/submit-answer/', {
        method: 'POST',
        json: { question_id: questionId, selected },
      })
      setAnswers((prev) => ({ ...prev, [questionId]: res.correct }))
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to submit answer')
    }
  }

  async function openVideo() {
    setStatus(null)
    const weeklyId = activeNode?.weekly_content_id
    if (!weeklyId) { setStatus('No active week yet.'); return }
    try {
      const res = await fetch(apiUrl(`/api/video/${weeklyId}/`), { credentials: 'include' })
      if (!res.ok) throw new Error(`Video locked (${res.status}). Paid subscribers on Saturdays only.`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setVideoUrl(url)
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to open video')
    }
  }

  async function onVideoEnded() {
    const weeklyId = activeNode?.weekly_content_id
    if (!weeklyId) return
    try {
      await ensureCsrfCookie()
      await apiFetch(`/api/video/${weeklyId}/completed/`, { method: 'POST' })
      setStatus('✓ Video completed — +50 XP')
      const updated = await apiFetch<PathPayload>('/api/path/')
      setPath(updated)
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to mark completion')
    }
  }

  const completedCount = path?.nodes?.filter((n) => n.status === 'completed').length ?? 0
  const totalCount = path?.nodes?.length ?? 0

  return (
    <>
      {/* Celebration popup after successful subscription */}
      {showCelebration && (
        <CelebrationModal onClose={() => setShowCelebration(false)} />
      )}

      <div className="space-y-6">

      {/* Status banner */}
      {status && (
        <div className={['rounded-2xl px-5 py-4 text-base font-medium ring-1 backdrop-blur',
          status.startsWith('✓') ? 'bg-emerald-950/60 text-emerald-300 ring-emerald-500/30' : 'bg-red-950/60 text-red-300 ring-red-500/30'].join(' ')}>
          {status}
        </div>
      )}

      {/* ── Hero: Path Overview ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
              <BookOpen className="h-4 w-4" />
              Learning Path
            </div>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
              {path?.level ?? '—'} <span className="text-white/40">Training Loop</span>
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="text-4xl font-black text-white md:text-5xl">{completedCount}</div>
              <div className="text-sm text-white/50">of {totalCount} weeks<br />completed</div>
              <div className="ml-4 h-12 w-px bg-white/10" />
              <div className="text-4xl font-black text-yellow-500 md:text-5xl">{path?.progress_percent ?? 0}%</div>
              <div className="text-sm text-white/50">overall<br />progress</div>
            </div>
            {/* Progress bar */}
            <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-yellow-500 transition-all duration-700"
                style={{ width: `${path?.progress_percent ?? 0}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 self-start sm:flex-row">
            <button
              onClick={startDailyQuiz}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-base font-black uppercase tracking-widest text-white shadow-[0_0_25px_rgba(220,38,38,0.4)] transition-all hover:bg-red-500 hover:shadow-[0_0_35px_rgba(220,38,38,0.6)] active:scale-95"
            >
              <Zap className="h-5 w-5" />
              Daily Loop
            </button>
            <button
              onClick={() => navigate('/app/daily-revise')}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-black uppercase tracking-widest text-white shadow-[0_0_25px_rgba(5,150,105,0.3)] transition-all hover:bg-emerald-600 active:scale-95"
            >
              <BookOpen className="h-5 w-5" />
              Daily Revise
            </button>
          </div>
        </div>
      </div>

      {/* ── Week Nodes ── */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <h3 className="mb-6 text-lg font-bold uppercase tracking-wider text-white/70">Weekly Milestones</h3>
        {path?.nodes?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {path.nodes.map((n) => {
              const isCompleted = n.status === 'completed'
              const isActive = n.status === 'active'
              const isLocked = n.status === 'locked'
              return (
                <div
                  key={n.weekly_content_id}
                  className={['relative flex items-center gap-4 rounded-xl p-4 ring-1 transition-all duration-200',
                    isCompleted ? 'bg-yellow-500/10 ring-yellow-500/25' :
                    isActive ? 'bg-red-600/15 ring-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.2)]' :
                    'bg-white/[0.02] ring-white/8 opacity-60'].join(' ')}
                >
                  <div className={['flex h-12 w-12 flex-none items-center justify-center rounded-full text-lg font-black',
                    isCompleted ? 'bg-yellow-500 text-black' :
                    isActive ? 'bg-red-600 text-white' :
                    'bg-white/10 text-white/40'].join(' ')}>
                    {isCompleted ? <CheckCircle className="h-6 w-6" /> :
                     isLocked ? <Lock className="h-5 w-5" /> :
                     n.week_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-white">Week {n.week_number}</div>
                    <div className={['text-sm font-semibold capitalize',
                      isCompleted ? 'text-yellow-400' : isActive ? 'text-red-400' : 'text-white/30'].join(' ')}>
                      {n.status}
                    </div>
                  </div>
                  {isActive && (
                    <button
                      onClick={openVideo}
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 transition hover:bg-red-600 hover:ring-red-500"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Video
                    </button>
                  )}
                  {isCompleted && <ChevronRight className="h-5 w-5 text-yellow-500/50" />}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-base text-white/30">
            No approved weeks yet. Ask Sensei to approve content.
          </div>
        )}
      </div>

      {/* ── Fixed Week (Sensei-approved) Mondai ── */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Fixed Week</div>
            <div className="mt-2 text-xl font-black text-white">Today’s Quiz</div>
            <div className="mt-1 text-sm text-white/40">
              {fixedWeek?.week?.start && fixedWeek?.week?.end
                ? `${fixedWeek.week.start} → ${fixedWeek.week.end}`
                : 'No fixed week content yet. Ask Shitsumon to set the week after Sensei approval.'}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={goToTodayQuiz}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(234,179,8,0.25)] transition hover:bg-yellow-400 disabled:opacity-60"
              disabled={!fixedWeek?.week?.start}
            >
              Today’s Quiz
            </button>
          </div>
        </div>

        {task ? (
          <div className="mt-6 rounded-2xl bg-black/20 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-white">Daily Task</div>
              <div className="text-sm font-black text-yellow-400">{task.answered}/{task.target}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-yellow-500" style={{ width: `${Math.min(100, Math.round((task.answered / Math.max(1, task.target)) * 100))}%` }} />
            </div>
            <div className="mt-2 text-sm text-white/40">
              {task.rewarded ? 'Reward claimed for today.' : `${task.remaining} remaining to earn today’s reward.`}
            </div>
          </div>
        ) : null}

      </div>

      {/* ── Daily Quiz ── */}
      {quiz?.questions?.length ? (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Daily Quiz</h3>
            <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-bold text-yellow-400 ring-1 ring-yellow-500/30">
              Week {quiz.week.week_number}
            </span>
          </div>
          <div className="space-y-6">
            {quiz.questions.map((q) => (
              <div key={q.id} className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/10">
                <p className="text-base font-semibold text-white md:text-lg">{q.prompt}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const answered = answers[q.id] !== undefined
                    return (
                      <button
                        key={opt}
                        disabled={answered}
                        onClick={() => submitAnswer(q.id, opt)}
                        className={['flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium ring-1 transition-all duration-200',
                          !answered ? 'bg-white/[0.04] text-white ring-white/10 hover:bg-white/10 hover:ring-yellow-500/40 active:scale-98' :
                          'bg-white/[0.02] text-white/40 ring-white/5 cursor-not-allowed'].join(' ')}
                      >
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/10 text-xs font-black">{opt}</span>
                        <span>{q.options[opt]}</span>
                      </button>
                    )
                  })}
                </div>
                {answers[q.id] !== undefined && (
                  <div className={['mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold',
                    answers[q.id] ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400'].join(' ')}>
                    {answers[q.id] ? '✓ Correct — +1 XP' : '✗ Incorrect — scheduled for review'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Video Player ── */}
      {videoUrl && (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
          <h3 className="mb-4 text-xl font-black text-white">Video Lesson</h3>
          <div className="overflow-hidden rounded-xl">
            <video className="w-full" controls src={videoUrl} onEnded={onVideoEnded} />
          </div>
          <p className="mt-3 text-sm text-white/30">Completion is recorded when the video finishes.</p>
        </div>
      )}
    </div>
    </>
  )
}
