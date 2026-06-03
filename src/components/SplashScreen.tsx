import { useEffect, useRef, useState } from 'react'

type SplashScreenProps = {
  onFinish: () => void
}

// Deterministic particle config — stable across renders
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  size: 2 + (i % 4),
  x: (i * 37 + 11) % 97,
  y: (i * 53 + 7) % 95,
  delay: (i * 0.18) % 2.8,
  duration: 3.5 + (i % 5) * 0.6,
  opacity: 0.12 + (i % 6) * 0.06,
}))

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')
  const [tagVisible, setTagVisible] = useState(false)
  const finishedRef = useRef(false)

  const doFinish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setPhase('out')
    window.setTimeout(onFinish, 600)
  }

  useEffect(() => {
    // Sequence: logo fades in (0→600ms), tagline appears (700ms), hold, then auto-exit at 2.8s
    const t1 = window.setTimeout(() => setTagVisible(true), 700)
    const t2 = window.setTimeout(() => setPhase('hold'), 800)
    const t3 = window.setTimeout(doFinish, 2800)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') doFinish() }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      onClick={doFinish}
      role="button"
      tabIndex={0}
      aria-label="Splash screen – click to skip"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#030308',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.6s ease-out' : 'opacity 0.4s ease-in',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Deep radial gradient backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #1a0030 0%, #0a000f 55%, #000000 100%)',
      }} />

      {/* Ambient glow orbs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,0,255,0.12) 0%, transparent 70%)',
        animation: 'splashOrb1 4s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)',
        animation: 'splashOrb2 3.5s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '20%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)',
        animation: 'splashOrb3 5s ease-in-out infinite alternate',
      }} />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: p.id % 3 === 0
            ? `rgba(180,0,255,${p.opacity})`
            : p.id % 3 === 1
              ? `rgba(220,38,38,${p.opacity})`
              : `rgba(212,175,55,${p.opacity})`,
          animation: `splashFloat ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
        }} />
      ))}

      {/* Thin horizontal scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(180,0,255,0.4), rgba(220,38,38,0.4), transparent)',
        animation: 'splashScan 3s ease-in-out infinite',
      }} />

      {/* Centre logo block */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16,
      }}>
        {/* Logo wordmark */}
        <div style={{
          opacity: phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'scale(0.88) translateY(12px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.55s ease-out, transform 0.55s cubic-bezier(0.22,1,0.36,1)',
          display: 'flex', alignItems: 'baseline', gap: 4,
          fontFamily: "'Georgia', serif",
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(56px, 14vw, 96px)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          <span style={{
            backgroundImage: 'linear-gradient(135deg, #660000 0%, #cc0000 40%, #ff4444 70%, #ffffff 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 24px rgba(220,38,38,0.6))',
          }}>Ben</span>
          <span style={{
            backgroundImage: 'linear-gradient(180deg, #5c3d00 0%, #b8860b 30%, #ffd700 50%, #fffacd 55%, #daa520 70%, #8b6914 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 24px rgba(212,175,55,0.55))',
          }}>Go</span>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: tagVisible ? 1 : 0,
          transform: tagVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s',
          fontSize: 'clamp(12px, 3vw, 16px)',
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.38)',
        }}>
          Master Japanese · Unlock the World
        </div>

        {/* Thin divider */}
        <div style={{
          opacity: tagVisible ? 1 : 0,
          transition: 'opacity 0.5s ease-out 0.3s',
          width: 'clamp(60px, 12vw, 100px)', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
        }} />
      </div>

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: 28, right: 24,
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.18)',
        opacity: tagVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out 0.6s',
        userSelect: 'none',
      }}>
        Tap to skip
      </div>

      <style>{`
        @keyframes splashOrb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,20px) scale(1.1); } }
        @keyframes splashOrb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-25px,-15px) scale(1.08); } }
        @keyframes splashOrb3 { from { transform: translate(0,0); } to { transform: translate(15px,25px); } }
        @keyframes splashFloat { from { transform: translateY(0) scale(1); opacity: 0.6; } to { transform: translateY(-14px) scale(1.3); opacity: 1; } }
        @keyframes splashScan { 0% { top: -2px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  )
}
