import { useEffect, useRef } from 'react'
import './creature.css'

interface Props {
  /** 0–10 segments (derived from percent) */
  segments: number
  animTrigger: 'eat' | 'bite' | null
  showFood: boolean
}

export function SnakeCreature({ segments, animTrigger, showFood }: Props) {
  const headRef = useRef<HTMLDivElement>(null)
  const foodRef = useRef<HTMLDivElement>(null)
  const prevTrigger = useRef<string | null>(null)

  useEffect(() => {
    if (!animTrigger || animTrigger === prevTrigger.current) return
    prevTrigger.current = animTrigger

    const head = headRef.current
    if (!head) return

    if (animTrigger === 'eat') {
      head.classList.remove('eat', 'bite')
      void head.offsetWidth
      head.classList.add('eat')
      if (foodRef.current) {
        foodRef.current.classList.remove('eaten')
        void foodRef.current.offsetWidth
        foodRef.current.classList.add('eaten')
      }
      setTimeout(() => { head.classList.remove('eat'); prevTrigger.current = null }, 600)
    } else if (animTrigger === 'bite') {
      head.classList.remove('eat', 'bite')
      void head.offsetWidth
      head.classList.add('bite')
      setTimeout(() => { head.classList.remove('bite'); prevTrigger.current = null }, 700)
    }
  }, [animTrigger])

  // Clamp segments 0–10
  const count = Math.max(0, Math.min(10, segments))

  return (
    <div className="snake-arena">
      {showFood && <div ref={foodRef} className="snake-food" />}
      <div className="snake-body">
        {/* Head (first, but flex-direction: row-reverse so it renders left) */}
        <div ref={headRef} className="snake-head">
          <div className="snake-tongue" />
        </div>
        {/* Body segments */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="snake-segment" />
        ))}
        {/* Tail only if any body */}
        {count > 0 && <div className="snake-tail" />}
      </div>
    </div>
  )
}
