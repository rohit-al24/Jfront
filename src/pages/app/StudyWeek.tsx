import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { apiFetch } from '../../api'

type StudyQuestion = {
  id: number
  mondai_public_id: string
  prompt: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
  correct: 'A' | 'B' | 'C' | 'D'
}

type StudyPayload = {
  date: string
  week: { start: string | null; end: string | null }
  questions: StudyQuestion[]
}

function stripMeaningPrefix(prompt: string) {
  const p = (prompt || '').trim()
  const withoutPrefix = p.replace(/^what\s+is\s+the\s+meaning\s+of\s+/i, '')
  return withoutPrefix.replace(/\?\s*$/g, '').trim()
}

export function StudyWeek() {
  const navigate = useNavigate()
  const params = useParams<{ start: string }>()
  const start = params.start || ''

  const [data, setData] = useState<StudyPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    const ws = data?.week?.start
    const we = data?.week?.end
    if (ws && we) return `${ws} → ${we}`
    return start ? `Week of ${start}` : 'Study'
  }, [data, start])

  useEffect(() => {
    if (!start) return
    setError(null)
    setData(null)
    apiFetch<StudyPayload>(`/api/week/current/study/?date=${encodeURIComponent(start)}`)
      .then(setData)
      .catch((e: any) => setError(e?.message ?? 'Failed to load study'))
  }, [start])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Study</div>
            <div className="mt-2 text-3xl font-black text-white">{title}</div>
            <div className="mt-2 text-base text-white/40">Questions & Answers (no options)</div>
          </div>
          <button
            onClick={() => navigate('/app/study')}
            className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-600/10 p-4 text-base font-semibold text-red-200 ring-1 ring-red-500/20">
            {error}
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="rounded-2xl bg-white/[0.03] p-0 ring-1 ring-white/10 overflow-hidden">
          <div className="grid grid-cols-12 gap-0 bg-black/20 px-4 py-3 text-base font-black uppercase tracking-widest text-white/40">
            <div className="col-span-2">S.No</div>
            <div className="col-span-6">Question</div>
            <div className="col-span-4">Answer</div>
          </div>

          {data.questions.length === 0 ? (
            <div className="px-4 py-6 text-base text-white/50">No questions in this fixed week yet.</div>
          ) : (
            <div>
              {data.questions.map((q, idx) => {
                const answer = q.options[q.correct]
                return (
                  <div key={q.id} className="grid grid-cols-12 gap-0 border-t border-white/10 px-4 py-5 text-lg">
                    <div className="col-span-2 font-bold text-white/70">{idx + 1}</div>
                    <div className="col-span-6 font-semibold text-white">{stripMeaningPrefix(q.prompt)}</div>
                    <div className="col-span-4 font-semibold text-emerald-300">{answer}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 text-base text-white/50">Loading…</div>
      )}
    </div>
  )
}
