import { useEffect, useRef, useState } from 'react'

// Orange autumn leaf palette — extracted from reference image
const LEAF_COLORS = ['#d35400', '#e67e22', '#a64a00', '#b57f50'] as const

type Settings = {
  bgColor: string
  minWind: number
  maxWind: number
  minSize: number
  maxSize: number
  emitterY: number
  emitterSpread: number
  gravity: number
  turbulence: number
  rotationSpeed: number
  tumbleStrength: number
  staticTilt: number
  particleCount: number
}

export function ParticleScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    bgColor: '#0a0a0a',
    minWind: 1.5,
    maxWind: 38,
    minSize: 16,
    maxSize: 57,
    emitterY: 0.5,
    emitterSpread: 0.54,
    gravity: 0,
    turbulence: 0.8,
    rotationSpeed: 0,
    tumbleStrength: 0.4,
    staticTilt: 0,
    particleCount: 100,
  })

  // Physics and Animation Logic
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = canvas.getContext('2d')!   // non-null alias usable inside class closures

    let width: number, height: number
    let particles: Particle[] = []
    let animationFrameId: number

    // ── Ellipse-based orange leaf — no SVG image, no wind lines ──
    class Particle {
      color: string = LEAF_COLORS[0]
      leafW: number = 0   // half-width of ellipse
      leafH: number = 0   // half-height of ellipse
      x: number = 0
      y: number = 0
      windFactor: number = 0
      vx: number = 0
      vy: number = 0
      angleZ: number = 0      // 2-D spin (radians)
      spinZ: number = 0
      angleX: number = 0      // 3-D tumble axis (degrees)
      spinX: number = 0

      constructor(onScreen: boolean) { this.reset(onScreen) }

      reset(onScreen: boolean) {
        this.color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]

        const minS = Math.min(settings.minSize, settings.maxSize)
        const maxS = Math.max(settings.minSize, settings.maxSize)
        const w = minS + Math.random() * (maxS - minS)
        this.leafW = w / 2
        this.leafH = (w * (1.2 + Math.random() * 0.4)) / 2   // slight ellipse

        const centerY = height * settings.emitterY
        const spread  = height * settings.emitterSpread
        this.y = centerY - spread / 2 + Math.random() * spread
        this.x = onScreen ? Math.random() * width : -w - Math.random() * 200

        this.windFactor = Math.random()
        // Start with slight diagonal drift
        this.vx = 0.8 + Math.random() * 1.2
        this.vy = (Math.random() - 0.3) * settings.turbulence * 1.5  // bias downward

        this.angleZ = Math.random() * Math.PI * 2
        this.spinZ  = (Math.random() - 0.5) * settings.rotationSpeed

        this.angleX = (Math.random() - 0.5) * settings.tumbleStrength * 10
        this.spinX  = (Math.random() - 0.5) * settings.tumbleStrength * 0.01
      }

      update() {
        // Wind: invisible force → acceleration → velocity (no lines drawn)
        const minW = Math.min(settings.minWind, settings.maxWind)
        const maxW = Math.max(settings.minWind, settings.maxWind)
        const wind = minW + (maxW - minW) * this.windFactor

        this.vx += wind * 0.01
        this.vx *= 0.99                                        // horizontal friction

        this.vy += settings.gravity * 0.06                     // gravity pull
        this.vy += Math.sin(this.x * 0.015) * (settings.turbulence * 0.04)  // gentle sway
        this.vy *= 0.99                                        // vertical friction

        this.x += this.vx
        this.y += this.vy

        // 2-D spin
        this.angleZ += this.spinZ

        // 3-D tumble (X-axis wobble, reverses direction at amplitude limit)
        this.angleX += this.spinX
        if (Math.abs(this.angleX) > settings.tumbleStrength * 10) this.spinX *= -1

        if (this.x > width + 100 || this.y > height + 100 || this.y < -100) {
          this.reset(false)
        }
      }

      draw() {
        // Tumble squishes the leaf height via cosine (3-D illusion)
        const tumble = Math.abs(Math.cos((this.angleX * Math.PI) / 180))
        const tiltRad = (settings.staticTilt * Math.PI) / 180

        c.save()
        c.translate(this.x, this.y)
        c.rotate(tiltRad)

        // Smooth orange ellipse body
        c.fillStyle = this.color
        c.beginPath()
        c.ellipse(0, 0, this.leafW, this.leafH * tumble, this.angleZ, 0, Math.PI * 2)
        c.fill()

        // Central stem line — saddle-brown, follows the 2-D rotation
        c.strokeStyle = '#8B4513'
        c.lineWidth = 1
        const cosA = Math.cos(this.angleZ)
        const sinA = Math.sin(this.angleZ)
        const r = this.leafW - 2
        c.beginPath()
        c.moveTo( r * cosA,  r * sinA * tumble)
        c.lineTo(-r * cosA, -r * sinA * tumble)
        c.stroke()

        c.restore()
      }
    }

    const resize = () => {
      width  = canvas.width  = window.innerWidth
      height = canvas.height = window.innerHeight
      c.imageSmoothingEnabled = true
      c.imageSmoothingQuality = 'high'
      particles = Array.from({ length: settings.particleCount }, () => new Particle(true))
    }

    const animate = () => {
      c.fillStyle = settings.bgColor
      c.fillRect(0, 0, width, height)
      particles.forEach(p => { p.update(); p.draw() })
      animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    resize()
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [settings])

  // ─── Slider helper ───────────────────────────────────────────────────────────
  function Slider({
    label, min, max, step = 1, value, suffix = '', gold = false,
    onChange,
  }: {
    label: string; min: number; max: number; step?: number
    value: number; suffix?: string; gold?: boolean
    onChange: (v: number) => void
  }) {
    return (
      <div className="flex flex-col gap-1 rounded-md bg-white/[0.03] p-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold ${gold ? 'text-yellow-400' : 'text-gray-300'}`}>
            {label}
          </span>
          <span className="font-mono text-[11px] text-cyan-400">
            {Number.isInteger(step) ? value : value.toFixed(1)}{suffix}
          </span>
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
          className="h-1 w-full cursor-pointer accent-cyan-400"
        />
      </div>
    )
  }

  const S = settings   // shorthand

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Floating Settings Button */}
      {!showSettings && (
        <button
          onClick={() => setShowSettings(true)}
          className="absolute bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#0a0a0a]/90 text-xl shadow-lg transition-transform hover:scale-110"
        >
          ⚙️
        </button>
      )}

      {/* Settings Panel — dashboard aesthetic */}
      {showSettings && (
        <div className="absolute bottom-5 right-5 z-50 flex max-h-[88vh] w-80 flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0f0f0f]/90 p-5 text-white shadow-2xl backdrop-blur-md scrollbar-thin">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">
              Leaves Simulation
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded border border-gray-600 px-2 py-0.5 text-[11px] text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              Hide
            </button>
          </div>

          {/* Background colour */}
          <div className="flex flex-col gap-1.5 rounded-md bg-white/[0.03] p-2">
            <span className="text-xs font-semibold text-gray-300">Background</span>
            <input
              type="color" value={S.bgColor}
              onChange={e => setSettings({ ...S, bgColor: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-gray-700 bg-gray-900"
            />
          </div>

          <div className="h-px bg-gray-700" />

          <Slider label="Min Wind Speed" min={0} max={40} step={0.5} value={S.minWind}
            onChange={v => setSettings({ ...S, minWind: v })} />
          <Slider label="Max Wind Speed" min={0} max={60} step={0.5} value={S.maxWind}
            onChange={v => setSettings({ ...S, maxWind: v })} />

          <div className="h-px bg-gray-700" />

          <Slider label="Min Size" min={2} max={100} value={S.minSize} suffix="px"
            onChange={v => setSettings({ ...S, minSize: v })} />
          <Slider label="Max Size" min={2} max={200} value={S.maxSize} suffix="px"
            onChange={v => setSettings({ ...S, maxSize: v })} />

          <div className="h-px bg-gray-700" />

          <Slider label="Stream Height (Y)" min={0} max={100} value={Math.round(S.emitterY * 100)} suffix="%"
            onChange={v => setSettings({ ...S, emitterY: v / 100 })} />
          <Slider label="Stream Spread" min={0} max={100} value={Math.round(S.emitterSpread * 100)} suffix="%"
            onChange={v => setSettings({ ...S, emitterSpread: v / 100 })} />

          <div className="h-px bg-gray-700" />

          <Slider label="Gravity" min={-2} max={5} step={0.1} value={S.gravity}
            onChange={v => setSettings({ ...S, gravity: v })} />
          <Slider label="Turbulence" min={0} max={5} step={0.1} value={S.turbulence}
            onChange={v => setSettings({ ...S, turbulence: v })} />

          <div className="h-px bg-gray-700" />

          <Slider label="2D Spin Speed" min={0} max={0.5} step={0.01} value={S.rotationSpeed}
            onChange={v => setSettings({ ...S, rotationSpeed: v })} />
          <Slider label="Static Tilt (Y-Axis)" min={0} max={180} value={S.staticTilt} suffix="°" gold
            onChange={v => setSettings({ ...S, staticTilt: v })} />
          <Slider label="3D Tumble" min={0} max={10} step={0.1} value={S.tumbleStrength}
            onChange={v => setSettings({ ...S, tumbleStrength: v })} />

          <div className="h-px bg-gray-700" />

          <Slider label="Count" min={10} max={800} value={S.particleCount}
            onChange={v => setSettings({ ...S, particleCount: v })} />
        </div>
      )}
    </div>
  )
}
