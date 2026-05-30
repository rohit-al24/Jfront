import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'

// ── Confetti particle engine (no dependencies, pure CSS+JS) ──────────────────

const COLORS = ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c']

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function spawnConfetti(container: HTMLDivElement) {
  const COUNT = 80
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('div')
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const size  = random(6, 14)
    const startX = random(20, 80)          // % from left
    const endX   = random(-30, 30)         // drift
    const delay  = random(0, 0.6)          // stagger
    const dur    = random(1.4, 2.4)
    const rot    = random(-360, 360)
    const shape  = Math.random() > 0.4 ? '50%' : '2px'  // circle or rect

    el.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size * (Math.random() > 0.5 ? 0.5 : 1)}px;
      background: ${color};
      border-radius: ${shape};
      top: -20px;
      left: ${startX}%;
      opacity: 1;
      animation: confetti-fall ${dur}s ease-in ${delay}s forwards;
      --drift: ${endX}%;
      --rot: ${rot}deg;
      --dur: ${dur}s;
    `
    container.appendChild(el)
    setTimeout(() => el.remove(), (dur + delay + 0.5) * 1000)
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface CelebrationModalProps {
  onClose: () => void
}

export function CelebrationModal({ onClose }: CelebrationModalProps) {
  const confettiRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // First burst immediately, second at 600ms
    if (confettiRef.current) spawnConfetti(confettiRef.current)
    const t = setTimeout(() => {
      if (confettiRef.current) spawnConfetti(confettiRef.current)
    }, 600)
    return () => clearTimeout(t)
  }, [])

  function handleContinue() {
    onClose()
    navigate('/app/learn', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Dim backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleContinue}
      />

      {/* Confetti layer */}
      <div
        ref={confettiRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a0a] to-[#0d0d0d] p-8 text-center shadow-[0_0_80px_rgba(251,191,36,0.25)] ring-1 ring-yellow-500/30"
        style={{ animation: 'modal-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-yellow-500/20 blur-3xl" />

        {/* Badge icon */}
        <div
          className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500/15 ring-2 ring-yellow-500/40"
          style={{ animation: 'badge-spin 0.6s ease-out 0.2s both' }}
        >
          <BadgeCheck className="h-14 w-14 text-yellow-400" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h2
          className="text-3xl font-black text-white"
          style={{ animation: 'fade-up 0.5s ease-out 0.35s both' }}
        >
          You're a Subscriber!
        </h2>

        {/* Sub heading */}
        <p
          className="mt-2 text-base text-white/50"
          style={{ animation: 'fade-up 0.5s ease-out 0.45s both' }}
        >
          🎉 Full access is now unlocked. Welcome to BenGo Pro!
        </p>

        {/* Perks list */}
        <ul
          className="mt-5 space-y-2 text-left"
          style={{ animation: 'fade-up 0.5s ease-out 0.55s both' }}
        >
          {['Video lessons', 'Adaptive Pakka quiz', 'Grammar deep-dives', 'Certificate download'].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-white/70">
              <span className="text-yellow-400">✦</span> {f}
            </li>
          ))}
        </ul>

        {/* CTA button */}
        <button
          onClick={handleContinue}
          className="relative mt-7 w-full overflow-hidden rounded-2xl bg-yellow-500 py-4 text-lg font-black text-black shadow-[0_0_30px_rgba(251,191,36,0.5)] transition hover:bg-yellow-400 active:scale-95"
          style={{ animation: 'fade-up 0.5s ease-out 0.65s both' }}
        >
          <span className="relative z-10">Start Learning →</span>
          {/* Shimmer sweep */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{ animation: 'shimmer 1.8s ease-in-out 1s infinite' }}
          />
        </button>
      </div>
    </div>
  )
}
