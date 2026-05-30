import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, ChevronLeft } from 'lucide-react'
import { apiFetch } from '../../api'

type GrammarItem = {
  id: number
  title: string
  content: string
}

type UnitInfo = {
  id: number
  unit_number: number
  name: string
  level: string
}

export function Grammar() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const [unit, setUnit] = useState<UnitInfo | null>(null)
  const [grammar, setGrammar] = useState<GrammarItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!unitId) return
    apiFetch<{ unit: UnitInfo; grammar: GrammarItem[] }>(`/api/course/unit/${unitId}/grammar/`)
      .then((r) => {
        setUnit(r.unit)
        setGrammar(r.grammar)
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load grammar'))
  }, [unitId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Units
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <FileText className="h-4 w-4" />
            {unit?.level} - {unit?.name}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            Grammar
          </h2>
          <p className="mt-2 text-base text-white/50">
            Sentence patterns, particle usage, and grammar explanations.
          </p>

          <button
            onClick={() => navigate(`/app/course/unit/${unitId}/grammar-pakka`)}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
          >
            Start Grammar Pakka
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Grammar Content */}
      <div className="space-y-4">
        {grammar.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:p-8"
          >
            {item.title && (
              <h3 className="mb-4 text-xl font-black text-white">{item.title}</h3>
            )}
            <div
              className="prose prose-invert max-w-none text-white/70"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {item.content}
            </div>
          </div>
        ))}
      </div>

      {grammar.length === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <FileText className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No grammar content yet</p>
        </div>
      )}
    </div>
  )
}
