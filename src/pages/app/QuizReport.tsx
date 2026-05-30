import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { apiFetch } from '../../api'

type ReportItem = {
  question_id: number
  prompt: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
  selected: 'A' | 'B' | 'C' | 'D'
  selected_text: string | null
  correct: boolean
  correct_answer: 'A' | 'B' | 'C' | 'D'
  correct_text: string | null
}

type ReportPayload = {
  date: string
  summary: {
    total: number
    correct: number
    accuracy: number
    target: number
    answered: number
    rewarded: boolean
  }
  items: ReportItem[]
}

export function QuizReport() {
  const navigate = useNavigate()
  const params = useParams<{ date: string }>()
  const date = params.date || ''

  const [data, setData] = useState<ReportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const accuracyPct = useMemo(() => {
    if (!data) return 0
    return Math.round((data.summary.accuracy || 0) * 100)
  }, [data])

  useEffect(() => {
    apiFetch<ReportPayload>(`/api/quiz/history/${date}/`)
      .then(setData)
      .catch((e: any) => setError(e?.message ?? 'Failed to load report'))
  }, [date])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Report</div>
            <div className="mt-2 text-3xl font-black text-white">{date}</div>
          </div>
          <button
            onClick={() => navigate('/app/quiz')}
            className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-600/10 p-4 text-base font-semibold text-red-200 ring-1 ring-red-500/20">{error}</div>
        ) : null}

        {data ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-black/20 p-5 ring-1 ring-white/10">
              <div className="text-xs font-bold uppercase tracking-widest text-white/40">Score</div>
              <div className="mt-2 text-2xl font-black text-white">{data.summary.correct}/{data.summary.total}</div>
            </div>
            <div className="rounded-2xl bg-black/20 p-5 ring-1 ring-white/10">
              <div className="text-xs font-bold uppercase tracking-widest text-white/40">Accuracy</div>
              <div className="mt-2 text-2xl font-black text-white">{accuracyPct}%</div>
            </div>
            <div className="rounded-2xl bg-black/20 p-5 ring-1 ring-white/10">
              <div className="text-xs font-bold uppercase tracking-widest text-white/40">Task</div>
              <div className="mt-2 text-2xl font-black text-white">{data.summary.answered}/{data.summary.target}</div>
            </div>
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="rounded-2xl bg-white/[0.03] p-0 ring-1 ring-white/10 overflow-hidden">
          <div className="grid grid-cols-12 gap-0 bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-widest text-white/40">
            <div className="col-span-6">Question</div>
            <div className="col-span-3">Your Answer</div>
            <div className="col-span-3">Correct</div>
          </div>

          {data.items.length === 0 ? (
            <div className="px-4 py-6 text-base text-white/50">No attempts recorded for this date.</div>
          ) : (
            <div>
              {data.items.map((it) => (
                <div key={it.question_id} className="grid grid-cols-12 gap-0 border-t border-white/10 px-4 py-5 text-base">
                  <div className="col-span-6 font-semibold text-white">{it.prompt}</div>
                  <div className={['col-span-3 font-bold', it.correct ? 'text-emerald-300' : 'text-red-300'].join(' ')}>
                    {it.selected}. {it.selected_text ?? ''}
                  </div>
                  <div className="col-span-3 font-bold text-emerald-300">{it.correct_answer}. {it.correct_text ?? ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 text-base text-white/50">Loading…</div>
      )}
    </div>
  )
}
