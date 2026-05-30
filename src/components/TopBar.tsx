import { useEffect, useState } from 'react'
import { Zap, Flame, BookOpen } from 'lucide-react'

import { apiFetch } from '../api'

type PathPayload = {
  level: 'N5' | 'N4'
  completed_weeks: number
  total_weeks: number
  progress_percent: number
  points: number
  streak: number
}

export function TopBar() {
  const [path, setPath] = useState<PathPayload | null>(null)

  useEffect(() => {
    apiFetch<PathPayload>('/api/path/')
      .then(setPath)
      .catch(() => setPath(null))
  }, [])

  const pct = path?.progress_percent ?? 0

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Left — path progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">
            {path?.level ? `${path.level} Path` : 'Learning Path'}
          </span>
          <span className="ml-auto text-sm font-black text-yellow-400 md:hidden">{pct}%</span>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="relative h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-600 to-yellow-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
              aria-label="progress"
            />
          </div>
          <span className="hidden text-sm font-bold text-yellow-400 md:block">{pct}%</span>
          <span className="text-sm text-white/30">{path?.completed_weeks ?? 0}/{path?.total_weeks ?? 0} wks</span>
        </div>
      </div>

      {/* Right — stat pills */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl bg-yellow-500/10 px-3 py-2 ring-1 ring-yellow-500/25">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-black text-yellow-400">{path?.points ?? '—'}</span>
          <span className="text-xs text-white/30">XP</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-red-600/10 px-3 py-2 ring-1 ring-red-600/25">
          <Flame className="h-4 w-4 text-red-400" />
          <span className="text-sm font-black text-red-400">{path?.streak ?? 0}</span>
          <span className="text-xs text-white/30">streak</span>
        </div>
      </div>
    </div>
  )
}
