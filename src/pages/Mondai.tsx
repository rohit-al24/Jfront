import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api'

type MondaiPayload = {
  public_id: string
  name: string
  status: string
  transcript: string
  video: { type: string; url?: string }
  original_video_url?: string | null
  vocab: { term: string; reading: string; meaning: string }[]
  questions: any[]
}

export function Mondai() {
  const { publicId } = useParams<{ publicId: string }>()
  const [mondai, setMondai] = useState<MondaiPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicId) return
    apiFetch<{ mondai: MondaiPayload }>(`/api/mondai/${publicId}/`)
      .then((r) => setMondai(r.mondai))
      .catch((e: any) => setError(e?.message ?? 'Failed to load'))
  }, [publicId])

  if (error) return <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-base font-medium text-red-300 ring-1 ring-red-500/30">{error}</div>
  if (!mondai) return <div className="rounded-2xl bg-white/[0.03] px-5 py-4 text-base text-white/60 ring-1 ring-white/10">Loading…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">{mondai.name}</h1>

      <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
        {mondai.video.type === 'upload' && mondai.video.url && (
          <video className="w-full rounded-lg" controls src={mondai.video.url} />
        )}
        {mondai.video.type === 'link' && mondai.video.url && (
          <div>
            <div className="text-sm font-semibold text-white/50">Video link</div>
            <a
              className="mt-3 inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-wider text-white transition hover:bg-red-500"
              href={mondai.video.url}
              target="_blank"
              rel="noreferrer"
            >
              Open Video
            </a>
            {mondai.original_video_url && mondai.original_video_url !== mondai.video.url && (
              <div className="mt-3">
                <a className="text-sm text-white/60 underline" href={mondai.original_video_url} target="_blank" rel="noreferrer">Open on YouTube</a>
              </div>
            )}
          </div>
        )}
        {mondai.video.type === 'embed' && mondai.video.url && (
          <>
            <iframe
              src={mondai.video.url}
              style={{ width: '100%', height: 420, border: 0, borderRadius: 16, background: '#000' }}
              allowFullScreen
            />
            {mondai.original_video_url && (
              <div className="mt-3">
                <a
                  className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-wider text-white hover:bg-red-500"
                  href={mondai.original_video_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open on YouTube
                </a>
              </div>
            )}
          </>
        )}
        {mondai.video.type === 'none' && <div className="text-sm font-semibold text-white/50">No video provided.</div>}
      </div>

      {mondai.transcript && (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
          <h3 className="text-lg font-black text-white">Transcript</h3>
          <pre className="mt-3 text-sm text-white/60" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{mondai.transcript}</pre>
        </div>
      )}
    </div>
  )
}

export default Mondai
