import { useEffect, useState } from 'react'
import { RotateCcw, BookMarked, CheckCheck } from 'lucide-react'

import { apiFetch } from '../../api'

type DueReviews = {
  date: string
  count: number
  items: { id: number; question_id: number; prompt: string }[]
}

export function Review() {
  const [data, setData] = useState<DueReviews | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<DueReviews>('/api/reviews/due/')
      .then(setData)
      .catch((e: any) => setError(e?.message ?? 'Failed to load review queue'))
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d0a1a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
              <RotateCcw className="h-4 w-4" />
              Mistake Loop
            </div>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Review Queue</h2>
            <p className="mt-1 text-base text-white/40">Spaced-repetition for your missed questions.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/[0.05] px-5 py-3 text-center ring-1 ring-white/10">
              <div className="text-3xl font-black text-red-400">{data?.count ?? 0}</div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/40">Due Today</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] px-5 py-3 text-center ring-1 ring-white/10">
              <div className="text-base font-bold text-white/60">{data?.date ?? '—'}</div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/40">Date</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">{error}</div>
      )}

      {/* Items */}
      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-bold uppercase tracking-wider text-white/70">
          <BookMarked className="h-5 w-5" />
          Items to Review
        </h3>
        {data?.items?.length ? (
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10 transition-all hover:ring-yellow-500/30">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-red-600/20 text-red-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white">{item.prompt}</p>
                  <p className="mt-1 text-sm text-white/40">Question #{item.question_id}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-14 text-center">
            <CheckCheck className="h-12 w-12 text-emerald-500/40" />
            <p className="mt-4 text-xl font-bold text-white/30">All caught up!</p>
            <p className="mt-1 text-sm text-white/20">No reviews due right now. Come back tomorrow.</p>
          </div>
        )}
      </div>
    </div>
  )
}
