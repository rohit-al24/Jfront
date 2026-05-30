import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, FileText, Languages, ChevronLeft, Zap, CheckCircle2, Circle } from 'lucide-react'
import { apiFetch } from '../../api'
import { getUnitProgress } from '../../hooks/useUnitProgress'
import type { UnitProgress } from '../../hooks/useUnitProgress'

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
        {units.map((unit) => {
          const prog: UnitProgress = unitProgressMap[unit.id]

          // Vocab: 0 = nothing, 40 = studied, 100 = quiz done
          const vocabPct = prog.vocabQuizScore != null
            ? Math.max(40, prog.vocabQuizScore)
            : prog.vocabStudied ? 40 : 0
          const vocabLabel = prog.vocabQuizScore != null
            ? `Quiz: ${prog.vocabQuizScore}%`
            : prog.vocabStudied ? 'Studied' : 'Not started'
          const vocabColor = prog.vocabQuizScore != null
            ? (prog.vocabQuizScore >= 80 ? 'bg-emerald-500' : prog.vocabQuizScore >= 60 ? 'bg-yellow-500' : 'bg-red-500')
            : prog.vocabStudied ? 'bg-red-400' : 'bg-white/20'
          const vocabTextColor = prog.vocabQuizScore != null
            ? (prog.vocabQuizScore >= 80 ? 'text-emerald-400' : prog.vocabQuizScore >= 60 ? 'text-yellow-400' : 'text-red-400')
            : prog.vocabStudied ? 'text-red-300' : 'text-white/25'

          // Grammar: learn pct first, then quiz done = 100
          const grammarPct = prog.grammarQuizDone ? 100 : prog.grammarLearnPct
          const grammarLabel = prog.grammarQuizDone
            ? 'Quiz Cleared'
            : prog.grammarLearnPct > 0 ? `Learn: ${prog.grammarLearnPct}%` : 'Not started'
          const grammarColor = prog.grammarQuizDone
            ? 'bg-emerald-500'
            : prog.grammarLearnPct >= 80 ? 'bg-yellow-400'
            : prog.grammarLearnPct > 0 ? 'bg-yellow-500/70' : 'bg-white/20'
          const grammarTextColor = prog.grammarQuizDone
            ? 'text-emerald-400'
            : prog.grammarLearnPct > 0 ? 'text-yellow-400' : 'text-white/25'

          return (
          <div
            key={unit.id}
            className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10"
          >
            {/* Unit header */}
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
              {/* Overall unit completion dot */}
              {(prog.vocabQuizScore != null || prog.grammarQuizDone) && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/25">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {prog.vocabQuizScore != null && prog.grammarQuizDone ? 'Complete' : 'In Progress'}
                </span>
              )}
            </div>

            {/* Two Path Columns */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* ── Vocabulary Card ── */}
              <div className="flex flex-col rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/10">
                <div className="mb-2 flex items-center gap-2">
                  <Languages className="h-5 w-5 text-red-400" />
                  <h4 className="text-base font-bold text-white">Vocabulary</h4>
                  <span className="ml-auto text-xs text-white/30">{unit.vocab_count} words</span>
                </div>

                {/* Always-visible vocab progress */}
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className={`text-xs font-bold ${vocabTextColor}`}>{vocabLabel}</span>
                    {prog.vocabQuizScore != null && (
                      <span className={`text-xs font-black ${vocabTextColor}`}>{Math.max(40, prog.vocabQuizScore)}%</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${vocabColor}`}
                      style={{ width: `${vocabPct}%` }}
                    />
                  </div>
                  {/* Step dots */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${prog.vocabStudied ? 'text-red-300' : 'text-white/20'}`}>
                      {prog.vocabStudied ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      Studied
                    </div>
                    <div className="flex-1 h-px bg-white/10" />
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${prog.vocabQuizScore != null ? vocabTextColor : 'text-white/20'}`}>
                      {prog.vocabQuizScore != null ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      Quiz
                    </div>
                  </div>
                </div>

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
                <button
                  onClick={() => setPakkaWarning({ unitId: unit.id, path: `/app/course/unit/${unit.id}/adaptive-quiz` })}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600/20 px-4 py-2 text-sm font-bold text-violet-300 ring-1 ring-violet-500/30 transition hover:bg-violet-600 hover:text-white hover:ring-violet-500"
                >
                  <Zap className="h-4 w-4" /> Pakka Adaptive
                </button>
              </div>

              {/* ── Grammar Card ── */}
              <div className="flex flex-col rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/10">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-base font-bold text-white">Grammar</h4>
                  <span className="ml-auto text-xs text-white/30">{unit.grammar_count} topics</span>
                </div>

                {/* Always-visible grammar progress */}
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className={`text-xs font-bold ${grammarTextColor}`}>{grammarLabel}</span>
                    {grammarPct > 0 && (
                      <span className={`text-xs font-black ${grammarTextColor}`}>{grammarPct}%</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${grammarColor}`}
                      style={{ width: `${grammarPct}%` }}
                    />
                  </div>
                  {/* Step dots */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${prog.grammarLearnPct >= 100 ? 'text-yellow-300' : prog.grammarLearnPct > 0 ? 'text-yellow-400/70' : 'text-white/20'}`}>
                      {prog.grammarLearnPct >= 100 ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      Learned
                    </div>
                    <div className="flex-1 h-px bg-white/10" />
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${prog.grammarQuizDone ? 'text-emerald-400' : 'text-white/20'}`}>
                      {prog.grammarQuizDone ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      Quiz
                    </div>
                  </div>
                </div>

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
              </div>
            </div>
          </div>
          )
        })}
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
