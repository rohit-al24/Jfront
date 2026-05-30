import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

type DailyTaskPayload = {
  date: string
  target: number
  answered: number
  remaining: number
  rewarded: boolean
}

type HistoryRow = {
  date: string
  target: number
  answered: number
  rewarded: boolean
  total_attempts: number
  correct: number
  ended: boolean
}

export function Quiz() {
  const navigate = useNavigate()
  const { state } = useAuth()

  const isPaid = state?.user?.subscription_status === 'paid'

  const [task, setTask] = useState<DailyTaskPayload | null>(null)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const todayHistory = useMemo(() => {
    return (history ?? []).find((h) => h.date === todayIso) ?? null
  }, [history, todayIso])

  const todayAccuracyOk = useMemo(() => {
    if (!todayHistory) return null
    const total = Math.max(0, todayHistory.total_attempts)
    if (total <= 0) return null
    return todayHistory.correct / total >= 0.75
  }, [todayHistory])

  useEffect(() => {
    setError(null)
    apiFetch<DailyTaskPayload>('/api/daily-task/')
      .then(setTask)
      .catch((e: any) => setError(e?.message ?? 'Failed to load daily task'))
    apiFetch<{ items: HistoryRow[] }>('/api/quiz/history/')
      .then((d) => setHistory(d.items ?? []))
      .catch((e: any) => setError(e?.message ?? 'Failed to load quiz history'))
  }, [])

  const retestPriceLabel = '₹10'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Quiz</div>
            <div className="mt-2 text-3xl font-black text-white">Today’s Quiz</div>
            <div className="mt-2 text-base text-white/40">Answer questions to complete your daily task.</div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => navigate('/app/quiz/session/today')}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-400"
            >
              Start
            </button>
            {todayAccuracyOk === false && task && task.remaining === 0 ? (
              <button
                onClick={() => (isPaid ? navigate('/app/quiz/session/retake') : navigate('/app/shop'))}
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                Re-test {retestPriceLabel}
              </button>
            ) : null}
          </div>
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

        {todayAccuracyOk === false && task && task.remaining === 0 ? (
          <div className="mt-4 rounded-2xl bg-red-600/10 p-4 text-base font-semibold text-red-200 ring-1 ring-red-500/20">
            You need at least 75% accuracy to earn today’s streak. Re-test costs {retestPriceLabel}.
          </div>
        ) : todayAccuracyOk === true && task && task.remaining === 0 ? (
          <div className="mt-4 rounded-2xl bg-emerald-600/10 p-4 text-base font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
            Streak earned.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-600/10 p-4 text-base font-semibold text-red-200 ring-1 ring-red-500/20">
            {error}
          </div>
        ) : null}

      </div>

      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">History</div>
            <div className="mt-2 text-2xl font-black text-white">Past Quiz Days</div>
          </div>
        </div>

        {history === null ? (
          <div className="mt-4 text-base text-white/50">Loading…</div>
        ) : history.length === 0 ? (
          <div className="mt-4 text-base text-white/50">No history yet.</div>
        ) : (
          <div className="mt-6 space-y-2">
            {history.map((h) => (
              <div key={h.date} className="flex flex-col gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => navigate(`/app/quiz/${h.date}`)}
                  className="text-left"
                >
                  <div className="text-base font-black text-white">{h.date}</div>
                  <div className="mt-1 text-sm text-white/40">
                    Score {h.correct}/{Math.max(0, h.total_attempts)} · Task {h.answered}/{h.target} {h.rewarded ? '· Completed' : ''}
                  </div>
                </button>

                <div className="flex gap-2">
                  {h.ended && h.total_attempts > 0 && h.correct / h.total_attempts < 0.75 ? (
                    <button
                      onClick={() => (isPaid ? navigate('/app/quiz/session/retake') : navigate('/app/shop'))}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
                    >
                      Re-test {retestPriceLabel}
                    </button>
                  ) : null}
                  <button
                    onClick={() => navigate(`/app/quiz/${h.date}`)}
                    className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-400"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
