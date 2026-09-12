import { useState, useCallback, useEffect, useRef } from 'react'
import './App.css'

// ---------------------------------------------------------------------------
// Boredom curve — TEST MODE: 100% at 300 clicks
// ---------------------------------------------------------------------------
function clicksToBoredom(clicks: number): number {
  if (clicks === 0) return 0
  return Math.min((clicks / 300) * 100, 100)
}

// ---------------------------------------------------------------------------
// Message thresholds
// ---------------------------------------------------------------------------
function getMessage(pct: number): string {
  if (pct >= 100) return 'YOU ARE BORED.'
  if (pct >= 99) return 'JUST ONE MORE...'
  if (pct >= 95) return 'SO CLOSE.'
  if (pct >= 85) return 'Why are you still clicking?'
  if (pct >= 70) return 'This is getting ridiculous.'
  if (pct >= 50) return "You've committed to this."
  if (pct >= 25) return 'Still bored?'
  if (pct >= 10) return 'Getting there...'
  return "You're barely bored."
}

// ---------------------------------------------------------------------------
// SVG arc helper
// ---------------------------------------------------------------------------
function describeArc(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

// ---------------------------------------------------------------------------
// Progress Ring
// ---------------------------------------------------------------------------
function ProgressRing({ pct, celebrating }: { pct: number; celebrating: boolean }) {
  const size = 280
  const cx = size / 2
  const cy = size / 2
  const r = 110
  const startAngle = -90
  const endAngle = startAngle + (pct / 100) * 360

  const trackPath = describeArc(cx, cy, r, -90, 269.9999)
  const fillPath = pct > 0
    ? describeArc(cx, cy, r, startAngle, pct >= 100 ? 269.9999 : endAngle)
    : ''

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`progress-ring${celebrating ? ' ring-celebrating' : ''}`}
      aria-label={`Boredom progress: ${pct.toFixed(2)}%`}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-strong">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="ringGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="40%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke={celebrating ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.07)'}
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Fill */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={celebrating ? 'url(#ringGradFull)' : 'url(#ringGrad)'}
          strokeWidth={celebrating ? '14' : '12'}
          strokeLinecap="round"
          filter={celebrating ? 'url(#glow-strong)' : 'url(#glow)'}
          className="ring-fill"
        />
      )}

      {/* Center percentage */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        dominantBaseline="middle"
        className={`ring-pct-text${celebrating ? ' ring-pct-celebrating' : ''}`}
      >
        {pct.toFixed(2)}%
      </text>

      {/* Label */}
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        dominantBaseline="middle"
        className="ring-label-text"
      >
        {celebrating ? '🎉 BORED 🎉' : 'BORED'}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Particle type
// ---------------------------------------------------------------------------
interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; color: string
  size: number; shape: 'circle' | 'rect'
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
const DECAY_RATE = 0.015       // % lost per frame when idle (~0.9%/s at 60fps)
const IDLE_GRACE_MS = 1500     // ms before decay kicks in

export default function App() {
  const [clicks, setClicks] = useState(0)
  const [displayPct, setDisplayPct] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [showFlash, setShowFlash] = useState(false)

  const targetPctRef = useRef(0)
  const currentPctRef = useRef(0)
  const animFrameRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastClickTimeRef = useRef<number>(Date.now())
  const decayRafRef = useRef<number | null>(null)
  const celebratedRef = useRef(false)

  // ── Decay loop: runs independently, drains boredom when idle ────────────
  useEffect(() => {
    const decayTick = () => {
      const now = Date.now()
      const idleMs = now - lastClickTimeRef.current

      if (!celebratedRef.current && idleMs > IDLE_GRACE_MS && targetPctRef.current > 0) {
        targetPctRef.current = Math.max(0, targetPctRef.current - DECAY_RATE)
        // Also nudge clicks down so clicksToBoredom stays in sync
        const equivalentClicks = Math.round(targetPctRef.current * 3) // 300 clicks = 100%
        setClicks(equivalentClicks)
      }

      decayRafRef.current = requestAnimationFrame(decayTick)
    }

    decayRafRef.current = requestAnimationFrame(decayTick)
    return () => {
      if (decayRafRef.current) cancelAnimationFrame(decayRafRef.current)
    }
  }, [])

  // ── Smooth lerp toward targetPct ────────────────────────────────────────
  useEffect(() => {
    let rafId: number

    const animate = () => {
      const target = targetPctRef.current
      const diff = target - currentPctRef.current

      if (Math.abs(diff) < 0.001) {
        currentPctRef.current = target
        setDisplayPct(target)
        animFrameRef.current = null
        return
      }

      currentPctRef.current += diff * 0.12
      setDisplayPct(parseFloat(currentPctRef.current.toFixed(4)))
      rafId = requestAnimationFrame(animate)
      animFrameRef.current = rafId
    }

    if (animFrameRef.current === null) {
      animFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      animFrameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clicks])

  // ── Celebration: confetti burst + repeating waves ───────────────────────
  useEffect(() => {
    if (!celebrating) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width
    const H = canvas.height

    const colors = ['#a78bfa', '#818cf8', '#38bdf8', '#f472b6', '#facc15', '#4ade80', '#fb923c']

    const spawnBurst = (count: number) => {
      const newP: Particle[] = Array.from({ length: count }, () => ({
        x: W / 2 + (Math.random() - 0.5) * 300,
        y: H * 0.45,
        vx: (Math.random() - 0.5) * 12,
        vy: -(Math.random() * 16 + 4),
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 2,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
      }))
      particlesRef.current.push(...newP)
    }

    // Initial big burst
    spawnBurst(200)

    // Follow-up waves
    const wave1 = setTimeout(() => spawnBurst(80), 600)
    const wave2 = setTimeout(() => spawnBurst(60), 1200)

    let raf: number
    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      particlesRef.current = particlesRef.current.filter(p => p.life > 0.01)

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.3
        p.vx *= 0.99
        p.life -= 0.009
        ctx.globalAlpha = Math.min(p.life * 1.5, 1)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.life * 10)
          ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size)
          ctx.restore()
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(wave1)
      clearTimeout(wave2)
    }
  }, [celebrating])

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    lastClickTimeRef.current = Date.now()

    setClicks(prev => {
      const next = prev + 1
      const newPct = clicksToBoredom(next)
      targetPctRef.current = newPct

      if (newPct >= 100 && !celebratedRef.current) {
        celebratedRef.current = true
        setCelebrating(true)
        setShowFlash(true)
        setTimeout(() => setShowFlash(false), 600)
      }

      return next
    })
  }, [])

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setClicks(0)
    targetPctRef.current = 0
    currentPctRef.current = 0
    setDisplayPct(0)
    setCelebrating(false)
    celebratedRef.current = false
    setShowFlash(false)
    particlesRef.current = []
    lastClickTimeRef.current = Date.now()
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const pct = Math.min(displayPct, 100)
  const message = getMessage(pct)
  const isFull = celebrating

  return (
    <div className={`app-root${isFull ? ' celebrating' : ''}`}>
      {/* Flash overlay on 100% */}
      {showFlash && <div className="flash-overlay" />}

      {/* Ambient blobs */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="particle-canvas" />

      <main className="main-content">
        {/* Header */}
        <header className="site-header">
          <h1 className="site-title">BOREDAM</h1>
          <p className="site-subtitle">How bored are you?</p>
        </header>

        {/* Progress ring */}
        <div className="ring-wrapper">
          <ProgressRing pct={pct} celebrating={isFull} />
        </div>

        {/* Message */}
        <p className={`boredom-message${isFull ? ' full-message' : ''}`} key={Math.floor(pct / 5)}>
          {message}
        </p>

        {isFull && (
          <p className="congrats-text">
            Congratulations. You achieved absolutely nothing.
          </p>
        )}

        {/* Buttons */}
        <div className="button-area">
          {!isFull ? (
            <button
              id="bored-btn"
              className={`bored-btn${pressing ? ' pressing' : ''}`}
              onMouseDown={() => setPressing(true)}
              onMouseUp={() => setPressing(false)}
              onMouseLeave={() => setPressing(false)}
              onTouchStart={() => setPressing(true)}
              onTouchEnd={() => { setPressing(false); handleClick() }}
              onClick={handleClick}
              aria-label="I'm bored - click to increase boredom"
            >
              I'M BORED
            </button>
          ) : (
            <button
              id="reset-btn"
              className="reset-btn"
              onClick={handleReset}
              aria-label="Get bored again"
            >
              GET BORED AGAIN
            </button>
          )}
        </div>

        {/* Click counter */}
        <p className="click-counter">Clicks: {clicks.toLocaleString()}</p>

        {/* Idle drain warning */}
        {!isFull && clicks > 5 && (
          <p className="hint-text drain-hint">⚠ Stop clicking and it drains back down.</p>
        )}

        {!isFull && clicks === 0 && (
          <p className="hint-text">This might take a while.</p>
        )}
      </main>
    </div>
  )
}
