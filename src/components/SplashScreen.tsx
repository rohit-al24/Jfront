import { useEffect, useRef, useState } from 'react'

import desktopVideo from '../assets/BenGodesktop.mp4'
import mobileVideo from '../assets/BenGoMobile.mp4'

type SplashScreenProps = {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [leaving, setLeaving] = useState(false)
  const [ready, setReady] = useState(false)
  const finishedRef = useRef(false)
  const mobileRef = useRef<HTMLVideoElement | null>(null)
  const desktopRef = useRef<HTMLVideoElement | null>(null)

  const doFinish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setLeaving(true)
    // match CSS transition-duration (300ms) and give a small buffer
    window.setTimeout(() => {
      onFinish()
    }, 400)
  }

  useEffect(() => {
    const onEnded = () => doFinish()

    const m = mobileRef.current
    const d = desktopRef.current
    if (m) m.addEventListener('ended', onEnded)
    if (d) d.addEventListener('ended', onEnded)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') doFinish()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      if (m) m.removeEventListener('ended', onEnded)
      if (d) d.removeEventListener('ended', onEnded)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      onClick={doFinish}
      role="button"
      tabIndex={0}
      className={[
        'fixed inset-0 z-[100] overflow-hidden',
        'bg-black',
        'transition-opacity duration-300 ease-out',
        leaving ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      aria-label="Splash screen"
    >
      {/* Background video - mobile and desktop variants only (no text/overlays) */}
      <div className="absolute inset-0">
        <video
          ref={mobileRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          className={['h-full w-full object-cover transition-opacity duration-300 md:hidden', ready ? 'opacity-100' : 'opacity-0'].join(' ')}
        >
          <source src={mobileVideo} type="video/mp4" />
        </video>

        <video
          ref={desktopRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          className={['hidden h-full w-full object-cover transition-opacity duration-300 md:block', ready ? 'opacity-100' : 'opacity-0'].join(' ')}
        >
          <source src={desktopVideo} type="video/mp4" />
        </video>
      </div>
    </div>
  )
}
