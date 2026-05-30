import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight } from 'lucide-react'
import { apiFetch } from '../../api'

type Exam = {
  id: number
  code: string
  name: string
  description: string
  level_id: number | null
}

export function Course() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ exams: Exam[] }>('/api/course/exams/')
      .then((r) => setExams(r.exams))
      .catch((e: any) => setError(e?.message ?? 'Failed to load exams'))
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <BookOpen className="h-4 w-4" />
            Course
          </div>
          <h2 className="text-2xl font-black text-white md:text-3xl">
            Select Your Exam
          </h2>
          <p className="max-w-2xl text-base text-white/50">
            Choose an exam to begin your Japanese learning journey. Each exam contains structured units with vocabulary and grammar lessons.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Exams Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <button
            key={exam.id}
            onClick={() => {
              if (exam.level_id) navigate(`/app/course/${exam.level_id}`)
            }}
            disabled={!exam.level_id}
            className="group relative overflow-hidden rounded-2xl bg-white/[0.03] p-6 text-left ring-1 ring-white/10 transition-all hover:bg-white/[0.06] hover:ring-yellow-500/30 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
              <ChevronRight className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-yellow-600 text-xl font-black text-white shadow-lg">
              {exam.code}
            </div>
            <h3 className="text-xl font-black text-white">{exam.name}</h3>
            {exam.description && (
              <p className="mt-2 text-sm text-white/50">{exam.description}</p>
            )}
            {!exam.level_id && (
              <p className="mt-2 text-xs font-semibold text-yellow-600/70">Coming soon</p>
            )}
          </button>
        ))}
      </div>

      {exams.length === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No exams available yet</p>
          <p className="mt-1 text-sm text-white/30">Contact your Sensei to add course content</p>
        </div>
      )}
    </div>
  )
}

