import { useEffect, useRef, useState } from 'react'
import './creature.css'

interface Props {
  bulge: number        // 0.0–1.0 (percent / 100)
  animTrigger: 'pump' | 'droop' | null
}

// ── 8 discrete evolution stages ─────────────────────────────────────────────
export interface StageConfig {
  label:   string
  color:   string
  minBulge:number
  // body dimensions in px
  headS:   number
  neckH:   number
  torsoW:  number
  torsoH:  number
  armW:    number
  armH:    number
  legW:    number
  legH:    number
  eyeS:    number
  smiling: boolean   // baby / toddler have a smile
  crown:   boolean   // champion has crown
  glowing: boolean   // muscular / champion glow
}

export const CREATURE_STAGES: StageConfig[] = [
  // 0 Baby     0–12%
  { label:'Baby',     color:'#9ca3af', minBulge:0.00, headS:46, neckH:0,  torsoW:26, torsoH:18, armW:5,  armH:13, legW:6,  legH:12, eyeS:7, smiling:true,  crown:false, glowing:false },
  // 1 Toddler  12–25%
  { label:'Toddler',  color:'#7dd3fc', minBulge:0.12, headS:40, neckH:3,  torsoW:28, torsoH:24, armW:6,  armH:19, legW:7,  legH:20, eyeS:5, smiling:true,  crown:false, glowing:false },
  // 2 Kid      25–40%
  { label:'Kid',      color:'#34d399', minBulge:0.25, headS:34, neckH:5,  torsoW:32, torsoH:32, armW:7,  armH:25, legW:8,  legH:28, eyeS:5, smiling:false, crown:false, glowing:false },
  // 3 Rookie   40–55%
  { label:'Rookie',   color:'#94a3b8', minBulge:0.40, headS:30, neckH:6,  torsoW:36, torsoH:40, armW:9,  armH:30, legW:9,  legH:34, eyeS:4, smiling:false, crown:false, glowing:false },
  // 4 Trainee  55–70%
  { label:'Trainee',  color:'#60a5fa', minBulge:0.55, headS:29, neckH:7,  torsoW:44, torsoH:44, armW:12, armH:34, legW:10, legH:38, eyeS:4, smiling:false, crown:false, glowing:false },
  // 5 Athlete  70–82%
  { label:'Athlete',  color:'#f59e0b', minBulge:0.70, headS:28, neckH:8,  torsoW:52, torsoH:48, armW:16, armH:37, legW:12, legH:40, eyeS:4, smiling:false, crown:false, glowing:false },
  // 6 Muscular 82–94%
  { label:'Muscular', color:'#ef4444', minBulge:0.82, headS:27, neckH:10, torsoW:60, torsoH:50, armW:19, armH:39, legW:14, legH:41, eyeS:4, smiling:false, crown:false, glowing:true  },
  // 7 Champion 94–100%
  { label:'Champion', color:'#fbbf24', minBulge:0.94, headS:27, neckH:11, torsoW:68, torsoH:52, armW:22, armH:40, legW:16, legH:42, eyeS:4, smiling:false, crown:true,  glowing:true  },
]

export function getCreatureStageIdx(bulge: number): number {
  for (let i = CREATURE_STAGES.length - 1; i >= 0; i--) {
    if (bulge >= CREATURE_STAGES[i].minBulge) return i
  }
  return 0
}

// ── Smoke burst particles on evolution ──────────────────────────────────────
function SmokeBurst({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * 360
        const rad   = (angle * Math.PI) / 180
        const dist  = 40 + (i % 4) * 14
        const size  = 6 + (i % 4) * 5
        return (
          <div
            key={i}
            className="evo-smoke"
            style={{
              width: size, height: size,
              left: `calc(50% - ${size / 2}px)`,
              top:  `calc(50% - ${size / 2}px)`,
              background:   i % 2 === 0 ? color : '#ffffff',
              boxShadow:    `0 0 ${size + 4}px ${color}`,
              animationDelay: `${i * 25}ms`,
              '--smoke-tx': `${Math.round(Math.cos(rad) * dist)}px`,
              '--smoke-ty': `${Math.round(Math.sin(rad) * dist - 22)}px`,
            } as React.CSSProperties}
          />
        )
      })}
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function BodybuilderCreature({ bulge, animTrigger }: Props) {
  const figRef  = useRef<HTMLDivElement>(null)
  const armLRef = useRef<HTMLDivElement>(null)
  const armRRef = useRef<HTMLDivElement>(null)
  const prevTrigger = useRef<string | null>(null)
  const prevIdx     = useRef(0)

  const clamped = Math.max(0, Math.min(1, bulge))
  const idx     = getCreatureStageIdx(clamped)
  const shape   = CREATURE_STAGES[idx]

  const [evolving,    setEvolving]    = useState(false)
  const [smokeColor,  setSmokeColor]  = useState(shape.color)

  // Stage-up → fire evolution burst
  useEffect(() => {
    if (idx > prevIdx.current) {
      setSmokeColor(shape.color)
      setEvolving(true)
      const t = setTimeout(() => setEvolving(false), 950)
      prevIdx.current = idx
      return () => clearTimeout(t)
    }
    prevIdx.current = idx
  }, [idx, shape.color])

  // Pump / droop on correct / wrong answer
  useEffect(() => {
    if (!animTrigger || animTrigger === prevTrigger.current) return
    prevTrigger.current = animTrigger
    const fig  = figRef.current
    const armL = armLRef.current
    const armR = armRRef.current
    if (animTrigger === 'pump') {
      fig?.classList.remove('pump', 'droop');  void fig?.offsetWidth;  fig?.classList.add('pump')
      armL?.classList.remove('flex-l');         void armL?.offsetWidth; armL?.classList.add('flex-l')
      armR?.classList.remove('flex-r');         void armR?.offsetWidth; armR?.classList.add('flex-r')
      setTimeout(() => {
        fig?.classList.remove('pump')
        armL?.classList.remove('flex-l')
        armR?.classList.remove('flex-r')
        prevTrigger.current = null
      }, 700)
    } else if (animTrigger === 'droop') {
      fig?.classList.remove('pump', 'droop');  void fig?.offsetWidth;  fig?.classList.add('droop')
      setTimeout(() => { fig?.classList.remove('droop'); prevTrigger.current = null }, 750)
    }
  }, [animTrigger])

  const {
    color, headS, neckH, torsoW, torsoH,
    armW, armH, legW, legH, eyeS,
    smiling, crown, glowing,
  } = shape
  const T      = 'all 0.55s cubic-bezier(0.34,1.56,0.64,1)'
  const waistW = Math.max(torsoW - 10, 16)

  return (
    <div className={`man-arena${evolving ? ' evo-active' : ''}`}>
      {evolving && <SmokeBurst color={smokeColor} />}
      {evolving && (
        <div
          className="evo-flash"
          style={{ background: `radial-gradient(circle, ${smokeColor}55 0%, transparent 70%)` }}
        />
      )}

      <div className="man-figure" ref={figRef}>
        {/* Crown — Champion only */}
        {crown && (
          <div style={{
            position: 'absolute',
            top: -(headS * 0.38),
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: Math.round(headS * 0.52),
            lineHeight: 1, zIndex: 5,
            filter: 'drop-shadow(0 0 8px #fbbf24)',
          }}>👑</div>
        )}

        {/* Head */}
        <div
          className="man-head"
          style={{
            width: headS, height: headS, borderRadius: '50%',
            boxShadow: glowing
              ? `0 0 24px ${color}aa, 0 0 48px ${color}33`
              : `0 0 12px ${color}44`,
            transition: T,
          }}
        >
          <div className="man-eye-l" style={{ width: eyeS, height: eyeS, top: Math.round(headS * 0.27), left: Math.round(headS * 0.17) }} />
          <div className="man-eye-r" style={{ width: eyeS, height: eyeS, top: Math.round(headS * 0.27), right: Math.round(headS * 0.17) }} />
          {/* Smile for baby / toddler */}
          {smiling && (
            <div style={{
              position: 'absolute',
              bottom: headS * 0.18, left: '50%', transform: 'translateX(-50%)',
              width: headS * 0.34, height: headS * 0.14,
              borderBottom: '2.5px solid #92400e',
              borderRadius: '0 0 50% 50%',
            }} />
          )}
        </div>

        {/* Neck */}
        {neckH > 0 && (
          <div
            className="man-neck"
            style={{ height: neckH, width: Math.max(8, Math.round(torsoW * 0.26)), transition: T }}
          />
        )}

        {/* Torso + Arms */}
        <div
          className="man-torso"
          style={{
            width: torsoW, height: torsoH,
            background: `linear-gradient(170deg, ${color} 0%, ${color}99 100%)`,
            boxShadow: glowing ? `0 0 20px ${color}77` : `0 0 8px ${color}33`,
            transition: T,
          }}
        >
          <div ref={armLRef} className="man-arm-l" style={{ width: armW, height: armH, background: color, transition: T }} />
          <div ref={armRRef} className="man-arm-r" style={{ width: armW, height: armH, background: color, transition: T }} />
        </div>

        {/* Waist */}
        <div className="man-waist" style={{ width: waistW, transition: T }} />

        {/* Legs */}
        <div className="man-legs">
          <div className="man-leg" style={{ width: legW, height: legH, transition: T }} />
          <div className="man-leg" style={{ width: legW, height: legH, transition: T }} />
        </div>
      </div>
    </div>
  )
}
