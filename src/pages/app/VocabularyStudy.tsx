import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronLeft, Volume2 } from 'lucide-react'
import { apiFetch } from '../../api'
import { saveUnitProgress } from '../../hooks/useUnitProgress'

function speakJa(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    // ignore
  }
}

function SpeakButton({ text }: { text: string }) {
  const [active, setActive] = useState(false)
  function handleClick() {
    speakJa(text)
    setActive(true)
    setTimeout(() => setActive(false), 800)
  }
  return (
    <button
      onClick={handleClick}
      title="Listen"
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 transition-all duration-200 ${
        active
          ? 'bg-yellow-500/25 ring-yellow-400/60 text-yellow-300 scale-110'
          : 'bg-white/[0.05] ring-white/10 text-white/40 hover:bg-yellow-500/15 hover:ring-yellow-400/40 hover:text-yellow-300 hover:scale-105'
      }`}
    >
      <Volume2 className="h-4 w-4" />
    </button>
  )
}

type VocabItem = {
  id: number
  target: string
  correct: string
}

type UnitInfo = {
  id: number
  unit_number: number
  name: string
  level: string
}

export function VocabularyStudy() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const [unit, setUnit] = useState<UnitInfo | null>(null)
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!unitId) return
    apiFetch<{ unit: UnitInfo; vocabulary: VocabItem[] }>(`/api/course/unit/${unitId}/vocabulary/study/`)
      .then((r) => {
        setUnit(r.unit)
        setVocabulary(r.vocabulary)
        if (r.vocabulary.length > 0) saveUnitProgress(unitId, { vocabStudied: true })
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load vocabulary'))
  }, [unitId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] p-6 ring-1 ring-white/10 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-yellow-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Units
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <BookOpen className="h-4 w-4" />
            {unit?.level} - {unit?.name}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            Vocabulary Study
          </h2>
          <p className="mt-2 text-base text-white/50">
            Memorize these words before taking the quiz.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {/* Vocabulary Table */}
      {vocabulary.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-yellow-500">
                  Hiragana
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-yellow-500">
                  English
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vocabulary.map((item) => (
                <tr key={item.id} className="group transition hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white">{item.target}</span>
                      <SpeakButton text={item.target} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-base text-white/70">
                    {item.correct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vocabulary.length === 0 && !error && (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center ring-1 ring-white/10">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-lg font-semibold text-white/40">No vocabulary items yet</p>
        </div>
      )}

      {/* Quiz Button */}
      {vocabulary.length > 0 && !error && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/app/course/unit/${unitId}/vocabulary/quiz`)}
            className="rounded-xl bg-red-600 px-8 py-4 text-base font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition hover:bg-red-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] active:scale-95"
          >
            Take Quiz Now
          </button>
        </div>
      )}
    </div>
  )
}
