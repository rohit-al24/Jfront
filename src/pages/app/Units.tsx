import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, FileText, Languages, ChevronLeft, Zap } from 'lucide-react'
import { apiFetch } from '../../api'
import { getUnitProgress } from '../../hooks/useUnitProgress'

type Unit = {
  id: number
  unit_number: number
  name: string
  description: string
  vocab_count: number
  grammar_count: number
}

type LevelInfo = {
  id: number
  level_number: number
  name: string
  exam_code?: string | null
  exam_name?: string | null
}

export function Units() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pakkaWarning, setPakkaWarning] = useState<{ unitId: number; path: string } | null>(null)

  // Per-unit progress from localStorage (re-computed whenever units array changes)
  const unitProgressMap = useMemo(
    () => Object.fromEntries(units.map(u => [u.id, getUnitProgress(u.id)])),
    [units]
  )

  const grammarQuery = (() => {
    const code = (level?.exam_code || '').trim()
    if (!code) return ''
    return `?exam_code=${encodeURIComponent(code)}`
  })()

  useEffect(() => {
    if (!levelId) return
    apiFetch<{ level: LevelInfo; units: Unit[] }>(`/api/course/level/${levelId}/units/`)
      .then((r) => {
        setLevel(r.level)
        setUnits(r.units)
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load units'))
  }, [levelId])

  return (
    <div className="space-y-6">
      {/* Pakka Warning Dialog */}
      {pakkaWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#12101a] p-6 ring-1 ring-violet-500/30 shadow-2xl text-center">
            <div className="mb-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/20 ring-1 ring-violet-500/40">
                <Zap className="h-6 w-6 text-violet-400" />
              </span>
            </div>
            <h3 className="text-lg font-black text-white mb-2">Start Pakka Session?</h3>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              Each Pakka session starts fresh with new session stats.<br />
              Your vocabulary progress is always <span className="text-violet-300 font-bold">saved to your account</span> — nothing is lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPakkaWarning(null)}
                className="flex-1 rounded-xl bg-white/5 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 transition ring-1 ring-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => { navigate(pakkaWarning.path); setPakkaWarning(null) }}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-black text-white hover:bg-violet-500 transition shadow-[0_0_16px_rgba(124,58,237,0.4)]"
              >
                Let's Go! ⚡
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => navigate('/app/course')}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Exams
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <BookOpen className="h-4 w-4" />
            {level?.exam_code || level?.name || 'Course'}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            {level?.exam_name || level?.name || 'Units'}
          </h2>
          <p className="mt-2 text-base text-white/50">
            Each unit contains vocabulary and grammar lessons. Choose a path to begin studying.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Units Grid */}
      <div className="space-y-4">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-yellow-500">
                  Unit {unit.unit_number}
                </div>
                <h3 className="mt-1 text-xl font-black text-white">{unit.name}</h3>
                {unit.description && (
                  <p className="mt-1 text-sm text-white/50">{unit.description}</p>
                )}
              </div>
            </div>

            {/* Two Path Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Vocabulary Path */}
              <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/10">
                <div className="mb-3 flex items-center gap-2">
                  <Languages className="h-5 w-5 text-red-400" />
                  <h4 className="text-base font-bold text-white">Vocabulary</h4>
                </div>
                <p className="mb-3 text-sm text-white/40">
                  {unit.vocab_count} {unit.vocab_count === 1 ? 'word' : 'words'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/app/course/unit/${unit.id}/vocabulary/study`)}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-red-600 hover:ring-red-500"
                  >
                    Study
                  </button>
                  <button
                    onClick={() => navigate(`/app/course/unit/${unit.id}/vocabulary/quiz`)}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transition hover:bg-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
                  >
                    Quiz
                  </button>
                </div>
                {/* Pakka Adaptive Quiz */}
                <button
                  onClick={() => setPakkaWarning({ unitId: unit.id, path: `/app/course/unit/${unit.id}/adaptive-quiz` })}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600/20 px-4 py-2 text-sm font-bold text-violet-300 ring-1 ring-violet-500/30 transition hover:bg-violet-600 hover:text-white hover:ring-violet-500"
                >
                  <Zap className="h-4 w-4" /> Pakka Adaptive
                </button>
                {/* Vocab progress badges */}
                {(unitProgressMap[unit.id]?.vocabStudied || unitProgressMap[unit.id]?.vocabQuizScore != null) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unitProgressMap[unit.id]?.vocabStudied && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/25">
                        ✓ Studied
                      </span>
                    )}
                    {unitProgressMap[unit.id]?.vocabQuizScore != null && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                        (unitProgressMap[unit.id]?.vocabQuizScore ?? 0) >= 80
                          ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25'
                          : (unitProgressMap[unit.id]?.vocabQuizScore ?? 0) >= 60
                          ? 'bg-yellow-500/15 text-yellow-300 ring-yellow-500/25'
                          : 'bg-red-500/15 text-red-300 ring-red-500/25'
                      }`}>
                        Quiz: {unitProgressMap[unit.id]?.vocabQuizScore}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Grammar Path */}
              <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/10">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-base font-bold text-white">Grammar</h4>
                </div>
                <p className="mb-3 text-sm text-white/40">
                  {unit.grammar_count} {unit.grammar_count === 1 ? 'topic' : 'topics'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/app/course/unit/${unit.id}/grammar/learn${grammarQuery}`)}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-yellow-600 hover:ring-yellow-500"
                  >
                    Learn
                  </button>
                  <button
                    onClick={() => navigate(`/app/course/unit/${unit.id}/grammar/quiz${grammarQuery}`)}
                    className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-yellow-500"
                  >
                    Quiz
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/app/course/unit/${unit.id}/grammar-pakka${grammarQuery}`)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-600/15 px-4 py-2 text-sm font-bold text-yellow-300 ring-1 ring-yellow-500/25 transition hover:bg-yellow-600 hover:text-white hover:ring-yellow-500"
                >
                  <Zap className="h-4 w-4" /> Pakka Adaptive
                </button>
                {/* Grammar progress indicators */}
                {(unitProgressMap[unit.id]?.grammarLearnPct > 0 || unitProgressMap[unit.id]?.grammarQuizDone) && (
                  <div className="mt-2 space-y-1.5">
                    {unitProgressMap[unit.id]?.grammarLearnPct > 0 && (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-white/30">Learn progress</span>
                          <span className="text-xs font-bold text-yellow-400">{unitProgressMap[unit.id]?.grammarLearnPct}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-yellow-500/70"
                            style={{ width: `${unitProgressMap[unit.id]?.grammarLearnPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {unitProgressMap[unit.id]?.grammarQuizDone && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/25">
                        ✓ Quiz Cleared
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {units.length === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No units available yet</p>
          <p className="mt-1 text-sm text-white/30">Contact your Sensei to add content</p>
        </div>
      )}
    </div>
  )
}
