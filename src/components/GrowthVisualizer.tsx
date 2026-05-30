import { useEffect, useRef, useState } from 'react'

export type GrowthTheme = 'bodybuilder' | 'tree' | 'city'

interface GrowthVisualizerProps {
  theme: GrowthTheme
  percent: number
  animate?: boolean
  animType?: 'success' | 'fail' | null
  size?: 'sm' | 'md' | 'lg'
  xpGain?: number
}

const STAGES: Record<GrowthTheme, { min: number; emoji: string; label: string; color: string }[]> = {
  bodybuilder: [
    { min: 0,   emoji: '🧍', label: 'Beginner',       color: '#6b7280' },
    { min: 30,  emoji: '🏃', label: 'Athletic',       color: '#3b82f6' },
    { min: 70,  emoji: '💪', label: 'Muscular',       color: '#f59e0b' },
    { min: 100, emoji: '🏆', label: 'Champion',       color: '#fbbf24' },
  ],
  tree: [
    { min: 0,   emoji: '🌱', label: 'Seedling',       color: '#6b7280' },
    { min: 30,  emoji: '🌿', label: 'Sapling',        color: '#22c55e' },
    { min: 70,  emoji: '🌳', label: 'Mature Tree',    color: '#16a34a' },
    { min: 100, emoji: '🌸', label: 'Sakura Bloom',   color: '#ec4899' },
  ],
  city: [
    { min: 0,   emoji: '⛺', label: 'Settlement',     color: '#6b7280' },
    { min: 30,  emoji: '🏘', label: 'Village',        color: '#a78bfa' },
    { min: 70,  emoji: '🏙', label: 'Modern City',    color: '#8b5cf6' },
    { min: 100, emoji: '🌃', label: 'Metropolis',     color: '#06b6d4' },
  ],
}

const SIZE_CFG = {
  sm: { ring: 80,  emoji: 'text-3xl', label: 'text-[10px]', pct: 'text-[9px]' },
  md: { ring: 120, emoji: 'text-5xl', label: 'text-xs',     pct: 'text-[10px]' },
  lg: { ring: 160, emoji: 'text-6xl', label: 'text-sm',     pct: 'text-xs' },
}

const SUCCESS_ANIM: Record<GrowthTheme, string> = {
  bodybuilder: 'animate-power-lift',
  city:        'animate-neon-upgrade',
  tree:        'animate-gentle-grow',
}

function getStage(theme: GrowthTheme, percent: number) {
  const stages = STAGES[theme]
  return stages.reduce<(typeof stages)[number]>((acc, s) => (percent >= s.min ? s : acc), stages[0])
}

function CircleRing({ pct, color, size }: { pct: number; color: string; size: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease',
          filter: `drop-shadow(0 0 6px ${color}aa)`,
        }}
      />
    </svg>
  )
}

export function GrowthVisualizer({
  theme,
  percent,
  animate = false,
  animType = null,
  size = 'md',
  xpGain,
}: GrowthVisualizerProps) {
  const clampedPct = Math.max(0, Math.min(100, percent))
  const stage = getStage(theme, clampedPct)
  const cfg = SIZE_CFG[size] ?? SIZE_CFG.md
  const emojiRef = useRef<HTMLSpanElement>(null)
  const prevLabelRef = useRef(stage.label)
  const [levelUp, setLevelUp] = useState(false)
  const [showXp, setShowXp] = useState(false)

  // Stage-change → fire level-up badge
  useEffect(() => {
    if (prevLabelRef.current !== stage.label) {
      prevLabelRef.current = stage.label
      setLevelUp(true)
      const t = setTimeout(() => setLevelUp(false), 2000)
      return () => clearTimeout(t)
    }
  }, [stage.label])

  // Floating XP on success
  useEffect(() => {
    if (animate && animType === 'success' && xpGain) {
      setShowXp(true)
      const t = setTimeout(() => setShowXp(false), 1200)
      return () => clearTimeout(t)
    }
  }, [animate, animType, xpGain])

  // Emoji animation
  useEffect(() => {
    if (!animate || !animType || !emojiRef.current) return
    const cls = animType === 'fail' ? 'animate-wilt' : SUCCESS_ANIM[theme]
    emojiRef.current.classList.remove(
      'animate-power-lift', 'animate-neon-upgrade', 'animate-gentle-grow', 'animate-wilt'
    )
    void emojiRef.current.offsetWidth
    emojiRef.current.classList.add(cls)
    const t = setTimeout(() => emojiRef.current?.classList.remove(cls), 1100)
    return () => clearTimeout(t)
  }, [animate, animType, theme])

  return (
    <div className="relative flex flex-col items-center gap-1.5 select-none" style={{ padding: '20px 40px' }}>
      {/* Level-up badge */}
      {levelUp && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 animate-level-up rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap"
          style={{
            background: `linear-gradient(135deg, ${stage.color}, ${stage.color}bb)`,
            boxShadow: `0 0 18px ${stage.color}88`,
          }}
        >
          ✦ LEVEL UP! ✦
        </div>
      )}

      {/* Floating XP */}
      {showXp && xpGain && (
        <div
          className="absolute right-4 top-4 z-20 animate-xp-flyup font-black text-yellow-400 pointer-events-none drop-shadow-lg"
          style={{ fontSize: 14, textShadow: '0 0 12px rgba(250, 204, 21, 0.8)' }}
        >
          +{xpGain} XP
        </div>
      )}

      {/* Circular ring + emoji */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: cfg.ring, height: cfg.ring }}
      >
        {/* Glow pulse on success */}
        {animate && animType === 'success' && (
          <div
            className="absolute inset-0 rounded-full animate-ring-pulse pointer-events-none"
            style={{ boxShadow: `0 0 0 3px ${stage.color}44, 0 0 24px ${stage.color}44` }}
          />
        )}
        <CircleRing pct={clampedPct} color={stage.color} size={cfg.ring} />
        <span
          ref={emojiRef}
          className={`relative z-10 leading-none ${cfg.emoji}`}
          style={{ filter: `drop-shadow(0 0 10px ${stage.color}99)` }}
        >
          {stage.emoji}
        </span>
      </div>

      {/* Label */}
      <span
        className={`font-black tracking-widest uppercase ${cfg.label}`}
        style={{ color: stage.color }}
      >
        {stage.label}
      </span>

      {/* Percent */}
      <span className={`text-white/40 ${cfg.pct}`}>{clampedPct}% mastered</span>
    </div>
  )
}
