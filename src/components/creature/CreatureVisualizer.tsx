/**
 * CreatureVisualizer
 *
 * Snake-game–inspired growth animation.
 * - bodybuilder: CSS stick-figure that gains muscle bulk
 * - tree: snake creature (green snake grows segments = "tree growing")  
 * - city: skyline buildings that rise and crumble
 *
 * No emoji. Pure CSS sprites.
 */
import { useEffect, useRef, useState } from 'react'
import { SnakeCreature } from './SnakeCreature'
import { BodybuilderCreature, CREATURE_STAGES, getCreatureStageIdx } from './BodybuilderCreature'
import { CityCreature } from './CityCreature'
import './creature.css'

export type CreatureTheme = 'bodybuilder' | 'tree' | 'city'

interface Props {
  theme: CreatureTheme
  percent: number                         // 0–100
  animate?: boolean                       // trigger pulse (set true then null)
  animType?: 'success' | 'fail' | null
  size?: 'sm' | 'md' | 'lg'
  xpGain?: number
}

// ── Snapshot label text per theme/stage ─────────────────────────────────────
const SNAKE_STAGES  = ['Hatchling', 'Crawler', 'Slitherer', 'Serpent', 'Python King']
const CITY_STAGES   = ['Camp', 'Village', 'Town', 'City', 'Metropolis']

const SNAKE_COLORS  = ['#6b7280', '#22c55e', '#16a34a', '#15803d', '#86efac']
const CITY_COLORS   = ['#6b7280', '#a78bfa', '#8b5cf6', '#7c3aed', '#06b6d4']

function getStageIndex(pct: number, stages: string[]) {
  const band = 100 / stages.length
  return Math.min(stages.length - 1, Math.floor(pct / band))
}

// Particles emitted on correct answer
function Particles({ color }: { color: string }) {
  const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <>
      {ANGLES.map((a, i) => {
        const rad = (a * Math.PI) / 180
        const dist = 30 + (i % 3) * 12
        return (
          <div
            key={i}
            className="particle"
            style={{
              background: color,
              top: '50%',
              left: '50%',
              '--px': `${Math.round(Math.cos(rad) * dist)}px`,
              '--py': `${Math.round(Math.sin(rad) * dist)}px`,
            } as React.CSSProperties}
          />
        )
      })}
    </>
  )
}

export function CreatureVisualizer({
  theme,
  percent,
  animate = false,
  animType = null,
  size = 'md',
  xpGain,
}: Props) {
  const pct = Math.max(0, Math.min(100, percent))

  // ── Derived values per theme ──────────────────────────────────────────────
  const segments     = Math.round((pct / 100) * 10)   // snake: 0–10 segments
  const bulge        = pct / 100                       // man: 0.0–1.0
  const buildingCount = Math.max(1, Math.round((pct / 100) * 6))  // city: 1–6
  const maxBuildH    = 40 + Math.round((pct / 100) * 60)          // city: 40–100px

  // ── Stage detection ───────────────────────────────────────────────────────
  const stageIdx   = theme === 'bodybuilder'
    ? getCreatureStageIdx(pct / 100)
    : getStageIndex(pct, theme === 'tree' ? SNAKE_STAGES : CITY_STAGES)
  const stageLabel = theme === 'bodybuilder'
    ? CREATURE_STAGES[stageIdx].label
    : (theme === 'tree' ? SNAKE_STAGES : CITY_STAGES)[stageIdx]
  const stageColor = theme === 'bodybuilder'
    ? CREATURE_STAGES[stageIdx].color
    : (theme === 'tree' ? SNAKE_COLORS : CITY_COLORS)[stageIdx]

  const prevLabelRef = useRef(stageLabel)
  const [levelUp, setLevelUp]   = useState(false)
  const [showXp,  setShowXp]    = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  // Stage-change → level-up badge
  useEffect(() => {
    if (prevLabelRef.current !== stageLabel) {
      prevLabelRef.current = stageLabel
      setLevelUp(true)
      const t = setTimeout(() => setLevelUp(false), 2200)
      return () => clearTimeout(t)
    }
  }, [stageLabel])

  // XP toast
  useEffect(() => {
    if (animate && animType === 'success' && xpGain) {
      setShowXp(true)
      setShowParticles(true)
      const t1 = setTimeout(() => setShowXp(false), 1100)
      const t2 = setTimeout(() => setShowParticles(false), 700)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [animate, animType, xpGain])

  // ── Map animType to creature-specific trigger ─────────────────────────────
  const snakeTrigger  = animate ? (animType === 'success' ? 'eat'   : 'bite')  : null
  const manTrigger    = animate ? (animType === 'success' ? 'pump'  : 'droop') : null
  const cityTrigger   = animate ? (animType === 'success' ? 'grow'  : 'crumble') : null

  // ── Scale sizes ───────────────────────────────────────────────────────────
  const scaleMap = { sm: 0.72, md: 1, lg: 1.3 }
  const scale = scaleMap[size] ?? 1

  // ── Progress bar ─────────────────────────────────────────────────────────
  const trackCls =
    theme === 'bodybuilder' ? 'man-track' : theme === 'tree' ? 'snake-track' : 'city-track'
  const fillCls =
    theme === 'bodybuilder' ? 'man-track-fill' : theme === 'tree' ? 'snake-track-fill' : 'city-track-fill'

  return (
    <div className="creature-wrap" style={{ transform: `scale(${scale})`, transformOrigin: 'center bottom' }}>
      {/* Level-up badge */}
      {levelUp && (
        <div
          className="level-up-badge"
          style={{
            background: `linear-gradient(135deg, ${stageColor}, ${stageColor}bb)`,
            boxShadow: `0 0 18px ${stageColor}88`,
          }}
        >
          ✦ LEVEL UP! ✦
        </div>
      )}

      {/* XP toast */}
      {showXp && xpGain && (
        <div className="xp-toast">+{xpGain} XP</div>
      )}

      {/* Particles */}
      {showParticles && <Particles color={stageColor} />}

      {/* Creature */}
      {theme === 'tree' && (
        <SnakeCreature
          segments={segments}
          animTrigger={snakeTrigger as any}
          showFood={animType !== 'success'}
        />
      )}
      {theme === 'bodybuilder' && (
        <BodybuilderCreature
          bulge={bulge}
          animTrigger={manTrigger as any}
        />
      )}
      {theme === 'city' && (
        <CityCreature
          buildingCount={buildingCount}
          maxHeight={maxBuildH}
          animTrigger={cityTrigger as any}
        />
      )}

      {/* Progress track */}
      <div className="relative w-full mt-2">
        <div className={trackCls} style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div
            className={fillCls}
            style={{ width: `${pct}%`, height: '100%', borderRadius: 3 }}
          />
        </div>
      </div>

      {/* Stage label */}
      <span className="creature-label" style={{ color: stageColor }}>
        {stageLabel}
      </span>
      <span className="creature-pct">{pct}% mastered</span>
    </div>
  )
}
