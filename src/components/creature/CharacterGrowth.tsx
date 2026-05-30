import { useEffect, useRef, useState } from 'react'
import './CharacterGrowth.css'

export interface CharacterGrowthProps {
  percent: number
  /** Increment this value (do NOT pass as React key) to re-fire an animation */
  triggerKey: number
  animTrigger: 'correct' | 'wrong' | null
  xpGain?: number
  size?: 'sm' | 'md' | 'lg'
}

interface StageConfig {
  label: string
  color: string
  glow: string
  headBg: string
  bodyBg: string
}

const STAGES: StageConfig[] = [
  // 0 — Novice (0–20 %)
  {
    label:   'Novice',
    color:   '#94a3b8',
    glow:    'rgba(148,163,184,0.28)',
    headBg:  'radial-gradient(circle at 35% 30%, #cbd5e1, #64748b)',
    bodyBg:  'linear-gradient(170deg, #64748b, #475569)',
  },
  // 1 — Student (20–40 %)
  {
    label:   'Student',
    color:   '#60a5fa',
    glow:    'rgba(96,165,250,0.35)',
    headBg:  'radial-gradient(circle at 35% 30%, #93c5fd, #3b82f6)',
    bodyBg:  'linear-gradient(170deg, #3b82f6, #2563eb)',
  },
  // 2 — Fighter (40–60 %)
  {
    label:   'Fighter',
    color:   '#34d399',
    glow:    'rgba(52,211,153,0.38)',
    headBg:  'radial-gradient(circle at 35% 30%, #6ee7b7, #10b981)',
    bodyBg:  'linear-gradient(170deg, #10b981, #059669)',
  },
  // 3 — Expert (60–80 %)
  {
    label:   'Expert',
    color:   '#fb923c',
    glow:    'rgba(251,146,60,0.42)',
    headBg:  'radial-gradient(circle at 35% 30%, #fdba74, #ea580c)',
    bodyBg:  'linear-gradient(170deg, #ea580c, #c2410c)',
  },
  // 4 — Master (80–100 %)
  {
    label:   'Master',
    color:   '#fbbf24',
    glow:    'rgba(251,191,36,0.5)',
    headBg:  'radial-gradient(circle at 35% 30%, #fde68a, #d97706)',
    bodyBg:  'linear-gradient(170deg, #f59e0b, #b45309)',
  },
]

function getStageIdx(pct: number): number {
  if (pct >= 80) return 4
  if (pct >= 60) return 3
  if (pct >= 40) return 2
  if (pct >= 20) return 1
  return 0
}

// Ring configs: 4 rings at increasing radii
const RING_SIZES = [108, 132, 156, 180]
const RING_DURATIONS = ['3.5s', '4.2s', '5s', '6s']

// Sparkle particles on correct answer
function Sparks({ color }: { color: string }) {
  return (
    <div className="cg-sparks">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * 360
        const r = (a * Math.PI) / 180
        const d = 44 + (i % 3) * 16
        return (
          <div
            key={i}
            className="cg-spark"
            style={{
              '--sx': `${Math.round(Math.cos(r) * d)}px`,
              '--sy': `${Math.round(Math.sin(r) * d)}px`,
              color: i % 2 === 0 ? color : '#fff',
              background: i % 2 === 0 ? color : '#fff',
              animationDelay: `${i * 38}ms`,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

// Evolution burst particles
function EvoBurst({ color }: { color: string }) {
  return (
    <div className="cg-evo-wrap">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 360
        const r = (a * Math.PI) / 180
        const d = 52 + (i % 4) * 18
        return (
          <div
            key={i}
            className="cg-evo-p"
            style={{
              '--ex': `${Math.round(Math.cos(r) * d)}px`,
              '--ey': `${Math.round(Math.sin(r) * d)}px`,
              color: i % 2 === 0 ? color : '#fff',
              background: i % 2 === 0 ? color : '#ffffffaa',
              animationDelay: `${i * 28}ms`,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

export function CharacterGrowth({
  percent,
  triggerKey,
  animTrigger,
  xpGain,
  size = 'md',
}: CharacterGrowthProps) {
  const pct       = Math.max(0, Math.min(100, percent))
  const stageIdx  = getStageIdx(pct)
  const stage     = STAGES[stageIdx]

  // Continuous scale: 0.55 at 0 % → 1.0 at 100 %
  const bodyScale = 0.55 + (pct / 100) * 0.45

  const prevKeyRef   = useRef(triggerKey)
  const prevStageRef = useRef(stageIdx)
  // Capture current animTrigger in a ref so the key-change effect reads the right value
  const animTriggerRef = useRef(animTrigger)
  animTriggerRef.current = animTrigger
  const xpGainRef = useRef(xpGain)
  xpGainRef.current = xpGain

  const [animClass,  setAnimClass]  = useState('')
  const [showSparks, setShowSparks] = useState(false)
  const [showXp,     setShowXp]     = useState(false)
  const [evolving,   setEvolving]   = useState(false)
  const [showBadge,  setShowBadge]  = useState(false)
  const [evoColor,   setEvoColor]   = useState(stage.color)

  // Fire animation when triggerKey changes (not when animTrigger changes)
  useEffect(() => {
    if (triggerKey === prevKeyRef.current) return
    prevKeyRef.current = triggerKey

    const trigger = animTriggerRef.current
    const xp      = xpGainRef.current

    if (trigger === 'correct') {
      setAnimClass('cg-correct')
      setShowSparks(true)
      if (xp && xp > 0) setShowXp(true)
      const t1 = setTimeout(() => setAnimClass(''),  660)
      const t2 = setTimeout(() => { setShowSparks(false); setShowXp(false) }, 1050)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    if (trigger === 'wrong') {
      setAnimClass('cg-wrong')
      const t = setTimeout(() => setAnimClass(''), 540)
      return () => clearTimeout(t)
    }
  }, [triggerKey])

  // Evolution burst when stage advances
  useEffect(() => {
    if (stageIdx > prevStageRef.current) {
      setEvoColor(stage.color)
      setEvolving(true)
      setShowBadge(true)
      const t1 = setTimeout(() => setEvolving(false),  1100)
      const t2 = setTimeout(() => setShowBadge(false), 2300)
      prevStageRef.current = stageIdx
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    prevStageRef.current = stageIdx
  }, [stageIdx, stage.color])

  const sizeScale = { sm: 0.72, md: 1, lg: 1.3 }[size] ?? 1

  return (
    <div
      className={`cg-arena ${animClass}`}
      style={{
        '--char-color': stage.color,
        '--char-glow':  stage.glow,
        '--body-scale': bodyScale,
        transform: `scale(${sizeScale})`,
        transformOrigin: 'center bottom',
      } as React.CSSProperties}
    >
      {/* Level-up badge */}
      {showBadge && (
        <div className="cg-level-up" style={{ '--char-color': evoColor } as React.CSSProperties}>
          ★ {STAGES[stageIdx].label}!
        </div>
      )}

      {/* Evolution particle burst */}
      {evolving && <EvoBurst color={evoColor} />}

      {/* Sparkle particles on correct */}
      {showSparks && <Sparks color={stage.color} />}

      {/* XP toast */}
      {showXp && xpGain && (
        <div className="cg-xp" style={{ color: stage.color }}>+{xpGain} XP</div>
      )}

      {/* Aura rings — appear progressively as stage increases */}
      <div className="cg-rings">
        {RING_SIZES.slice(0, stageIdx).map((sz, i) => {
          // Each ring fades in over the 20 % band after it first appears
          const fadeProgress = Math.min(1, Math.max(0, (pct - (i + 1) * 20) / 20))
          return (
            <div
              key={i}
              className="cg-ring-shell"
              style={{ width: sz, height: sz, opacity: fadeProgress }}
            >
              <div
                className="cg-ring"
                style={{
                  borderColor: stage.color,
                  boxShadow: `0 0 ${10 + i * 6}px ${stage.glow}, inset 0 0 ${5 + i * 3}px ${stage.glow}`,
                  animationDuration: RING_DURATIONS[i],
                  animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Flash overlay */}
      <div className="cg-flash" />

      {/* Figure — outer controls growth scale, inner handles bounce/shake */}
      <div className="cg-outer" style={{ '--body-scale': bodyScale } as React.CSSProperties}>
        <div className="cg-inner">
          {/* Crown for Master (stage 4) */}
          {stageIdx >= 4 && (
            <div className="cg-crown" style={{ color: stage.color }}>♛</div>
          )}

          {/* Head */}
          <div
            className="cg-head"
            style={{
              background: stage.headBg,
              boxShadow: `0 0 ${Math.round(bodyScale * 22)}px ${stage.glow}`,
            }}
          >
            <div className="cg-eye-l" />
            <div className="cg-eye-r" />
          </div>

          {/* Neck */}
          <div className="cg-neck" style={{ background: stage.color }} />

          {/* Torso + arms */}
          <div
            className="cg-torso"
            style={{
              background: stage.bodyBg,
              boxShadow: `0 0 ${Math.round(bodyScale * 14)}px ${stage.glow}`,
            }}
          >
            <div className="cg-arm cg-arm-l" style={{ background: stage.color }} />
            <div className="cg-arm cg-arm-r" style={{ background: stage.color }} />
          </div>

          {/* Waist */}
          <div className="cg-waist" />

          {/* Legs */}
          <div className="cg-legs">
            <div className="cg-leg" />
            <div className="cg-leg" />
          </div>
        </div>
      </div>

      {/* Stage label */}
      <div className="cg-stage-label" style={{ color: stage.color }}>{stage.label}</div>
      <div className="cg-pct-label">{pct}% mastered</div>
    </div>
  )
}
