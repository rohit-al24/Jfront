import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api'

type WeekListPayload = {
  today: string
  current: { start: string | null; end: string | null; question_count: number }
  previous: { start: string | null; end: string | null; question_count: number }
}

export function Study() {
  const navigate = useNavigate()
  const [weeks, setWeeks] = useState<WeekListPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<WeekListPayload>('/api/week/list/')
      .then((d) => setWeeks(d))
      .catch((e: any) => setError(e?.message ?? 'Failed to load weeks'))
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Study</div>
        <div className="mt-2 text-3xl font-black text-white">Weekly Study Lists</div>
        <div className="mt-2 text-base text-white/40">Pick a week to view Q&A.</div>

        {weeks ? (
          <div className="mt-6 space-y-2">
            {(
              [
                { key: 'current' as const, label: 'Current Week', data: weeks.current },
                { key: 'previous' as const, label: 'Previous Week', data: weeks.previous },
              ]
            ).map((row) => {
              const start = row.data?.start
              const end = row.data?.end
              const count = row.data?.question_count ?? 0
              return (
                <div
                  key={row.key}
                  className={[
                    'flex flex-col gap-3 rounded-xl p-4 ring-1 sm:flex-row sm:items-center sm:justify-between',
                    'bg-white/[0.03] ring-white/10',
                  ].join(' ')}
                >
                  <div>
                    <div className="text-base font-black text-white">{row.label}</div>
                    <div className="mt-1 text-sm text-white/50">
                      {start && end ? `${start} → ${end}` : 'No fixed week content'} · {count} questions
                    </div>
                  </div>
                  <button
                    onClick={() => (start ? navigate(`/app/study/week/${start}`) : null)}
                    disabled={!start}
                    className={[
                      'rounded-xl px-4 py-2 text-sm font-black uppercase tracking-widest transition',
                      'bg-yellow-500 text-black hover:bg-yellow-400',
                      !start ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    View
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 text-base text-white/50">Loading…</div>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-600/10 p-6 text-base font-semibold text-red-200 ring-1 ring-red-500/20">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 text-base text-white/50">
        Choose a week above to view its questions and answers.
      </div>
    </div>
  )
}
