import { useEffect, useRef } from 'react'
import './creature.css'

interface Props {
  /** 0–6 buildings visible (derived from percent) */
  buildingCount: number
  maxHeight: number      // tallest building height px (grows with percent)
  animTrigger: 'grow' | 'crumble' | null
}

// Per-building config: relative width, base hue offset, glow color
const BUILDING_CFG = [
  { flex: 1.2, hue: '#7c3aed', glow: '#7c3aed' },   // left deep purple
  { flex: 1.5, hue: '#6d28d9', glow: '#8b5cf6' },   // main tower
  { flex: 1.0, hue: '#4c1d95', glow: '#7c3aed' },
  { flex: 1.4, hue: '#5b21b6', glow: '#a78bfa' },   // center-right
  { flex: 1.1, hue: '#6d28d9', glow: '#8b5cf6' },
  { flex: 0.9, hue: '#4c1d95', glow: '#7c3aed' },   // rightmost
]

const HEIGHTS = [40, 70, 55, 90, 65, 50]  // base heights per building in px

export function CityCreature({ buildingCount, maxHeight, animTrigger }: Props) {
  const buildingRefs = useRef<(HTMLDivElement | null)[]>([])
  const prevTrigger = useRef<string | null>(null)
  const prevCount   = useRef(buildingCount)

  useEffect(() => {
    if (!animTrigger || animTrigger === prevTrigger.current) return
    prevTrigger.current = animTrigger

    const visibleBuildings = buildingRefs.current.slice(0, buildingCount)

    if (animTrigger === 'grow') {
      // Animate all visible buildings
      visibleBuildings.forEach((el) => {
        if (!el) return
        el.classList.remove('just-grew', 'just-shrank')
        void el.offsetWidth
        el.classList.add('just-grew')
      })
      // Check if a new building just appeared
      if (buildingCount > prevCount.current) {
        const newEl = buildingRefs.current[buildingCount - 1]
        if (newEl) {
          newEl.classList.add('just-appeared')
        }
      }
      setTimeout(() => {
        visibleBuildings.forEach((el) => el?.classList.remove('just-grew', 'just-appeared'))
        prevTrigger.current = null
      }, 700)
    } else if (animTrigger === 'crumble') {
      visibleBuildings.forEach((el) => {
        if (!el) return
        el.classList.remove('just-grew', 'just-shrank')
        void el.offsetWidth
        el.classList.add('just-shrank')
      })
      setTimeout(() => {
        visibleBuildings.forEach((el) => el?.classList.remove('just-shrank'))
        prevTrigger.current = null
      }, 700)
    }

    prevCount.current = buildingCount
  }, [animTrigger, buildingCount])

  const scale = Math.max(0.3, maxHeight / 90)   // normalize heights

  return (
    <div className="city-arena">
      <div className="city-stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="city-star" />
        ))}
      </div>

      {BUILDING_CFG.map((cfg, i) => {
        const visible = i < buildingCount
        const h = Math.round(HEIGHTS[i] * scale)
        return (
          <div
            key={i}
            ref={(el) => { buildingRefs.current[i] = el }}
            className={`city-building${i === 1 ? ' has-antenna' : ''}${visible ? ' lit' : ''}`}
            style={{
              flex: cfg.flex,
              height: visible ? h : 0,
              background: visible
                ? `linear-gradient(180deg, ${cfg.hue}cc 0%, ${cfg.hue} 100%)`
                : 'transparent',
              '--glow-color': cfg.glow,
              opacity: visible ? 1 : 0,
              transition: 'height 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
            } as React.CSSProperties}
          />
        )
      })}

      <div className="city-ground" />
    </div>
  )
}
