import { useState, useEffect, useCallback } from 'react'
import { fetchMoon, MoonResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysUntil(iso: string): number {
  const now = new Date()
  const target = new Date(iso)
  const diff = target.getTime() - now.getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function buildLitPath(illumination: number, phaseName: string, r: number, cx: number, cy: number): string {
  const name = (phaseName || '').toLowerCase()
  const isWaning = name.includes('waning') || name.includes('last')
  const isNew = illumination < 2
  if (isNew) return ''
  if (illumination >= 99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
  }
  const frac = illumination / 100
  const terminatorRx = Math.abs(r * Math.cos(Math.PI * frac))
  const terminatorFlipped = frac > 0.5
  const waning = isWaning && illumination < 99
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`
  const outerSweep = waning ? 0 : 1
  const innerSweep = waning ? (terminatorFlipped ? 0 : 1) : (terminatorFlipped ? 1 : 0)
  return [`M ${top}`, `A ${r} ${r} 0 0 ${outerSweep} ${bottom}`, `A ${terminatorRx} ${r} 0 0 ${innerSweep} ${top}`, 'Z'].join(' ')
}

// Craters: {x, y} normalized -1..1 from center, r = radius ratio, depth for shadow offset
const CRATERS = [
  { x: -0.10, y: -0.30, r: 0.10 }, // Tycho-like, south-center
  { x:  0.30, y: -0.20, r: 0.08 }, // upper right
  { x: -0.36, y:  0.12, r: 0.07 }, // left mid
  { x:  0.16, y:  0.36, r: 0.09 }, // lower right
  { x: -0.20, y:  0.44, r: 0.06 }, // lower left
  { x:  0.42, y:  0.28, r: 0.06 }, // far right low
  { x:  0.08, y: -0.46, r: 0.05 }, // upper center
  { x: -0.44, y: -0.24, r: 0.05 }, // far left high
  { x:  0.26, y:  0.10, r: 0.05 }, // center right
  { x: -0.06, y:  0.16, r: 0.07 }, // center
  { x:  0.46, y: -0.10, r: 0.04 }, // right edge
  { x: -0.30, y: -0.46, r: 0.04 }, // upper left
]

// Mare: approximate near-side basalt plains
const MARE = [
  { x: -0.10, y: -0.18, rx: 0.24, ry: 0.20 }, // Mare Imbrium (large, upper left)
  { x:  0.14, y: -0.08, rx: 0.13, ry: 0.10 }, // Mare Serenitatis
  { x:  0.22, y:  0.12, rx: 0.11, ry: 0.09 }, // Mare Tranquillitatis
  { x:  0.38, y: -0.14, rx: 0.08, ry: 0.07 }, // Mare Crisium
  { x: -0.06, y:  0.24, rx: 0.14, ry: 0.10 }, // Mare Nubium
  { x:  0.04, y:  0.38, rx: 0.09, ry: 0.07 }, // Mare Humorum
  { x: -0.28, y:  0.08, rx: 0.10, ry: 0.08 }, // Oceanus Procellarum fragment
]

function MoonSVG({ illumination, phaseName }: { illumination: number; phaseName: string }) {
  const size = 180
  const r = size / 2 - 5
  const cx = size / 2
  const cy = size / 2
  const litPath = buildLitPath(illumination, phaseName, r, cx, cy)
  const isNew = illumination < 2
  const isFull = illumination >= 98

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        {/* Lit surface: warm highland grey with off-centre highlight */}
        <radialGradient id="mSurf" cx="38%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#e2dbd0" />
          <stop offset="30%"  stopColor="#c5bdb0" />
          <stop offset="65%"  stopColor="#9e9890" />
          <stop offset="100%" stopColor="#6a6460" />
        </radialGradient>
        {/* Dark side: warm charcoal, not navy */}
        <radialGradient id="mDark" cx="38%" cy="42%" r="70%">
          <stop offset="0%"   stopColor="#252830" />
          <stop offset="55%"  stopColor="#16181f" />
          <stop offset="100%" stopColor="#0c0e13" />
        </radialGradient>
        {/* Earthshine: soft warm-blue wash over dark side */}
        <radialGradient id="mEarth" cx="42%" cy="48%" r="65%">
          <stop offset="0%"   stopColor="#5878a0" stopOpacity="0.18" />
          <stop offset="70%"  stopColor="#3a5070" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#3a5070" stopOpacity="0" />
        </radialGradient>
        {/* Limb darkening */}
        <radialGradient id="mLimb" cx="50%" cy="50%" r="50%">
          <stop offset="62%"  stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
        {/* Full moon glow */}
        <radialGradient id="mGlow" cx="50%" cy="50%" r="50%">
          <stop offset="80%"  stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(220,210,180,0.18)" />
        </radialGradient>
        {/* Terminator blur filter */}
        <filter id="mBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>

        <clipPath id="mCircle"><circle cx={cx} cy={cy} r={r} /></clipPath>
        <clipPath id="mLit">
          {litPath ? <path d={litPath} /> : <rect width="0" height="0" />}
        </clipPath>
      </defs>

      {/* === DARK SIDE === */}
      <circle cx={cx} cy={cy} r={r} fill="url(#mDark)" />

      {/* Earthshine wash */}
      {!isNew && (
        <circle cx={cx} cy={cy} r={r} fill="url(#mEarth)" clipPath="url(#mCircle)" />
      )}

      {/* Dark-side mare: faintly visible under earthshine */}
      {!isNew && MARE.map((m, i) => (
        <ellipse key={`dm${i}`}
          cx={cx + m.x * r} cy={cy + m.y * r}
          rx={m.rx * r} ry={m.ry * r}
          fill="#1e2230" opacity={0.5}
          clipPath="url(#mCircle)" />
      ))}

      {/* Dark-side craters: subtle depth under earthshine */}
      {!isNew && CRATERS.map((c, i) => (
        <circle key={`dc${i}`}
          cx={cx + c.x * r} cy={cy + c.y * r} r={c.r * r}
          fill="none" stroke="rgba(80,100,130,0.18)" strokeWidth="1.2"
          clipPath="url(#mCircle)" />
      ))}

      {/* === LIT SIDE === */}
      {!isNew && litPath && (
        <g clipPath="url(#mLit)">
          {/* Highland surface */}
          <circle cx={cx} cy={cy} r={r} fill="url(#mSurf)" />

          {/* Mare (dark basalt plains) */}
          {MARE.map((m, i) => (
            <ellipse key={`lm${i}`}
              cx={cx + m.x * r} cy={cy + m.y * r}
              rx={m.rx * r} ry={m.ry * r}
              fill="#5c5750" opacity={0.52}
              clipPath="url(#mCircle)" />
          ))}

          {/* Craters with shadow + rim highlight */}
          {CRATERS.map((c, i) => {
            const cr = c.r * r
            const shadow = cr * 0.18
            return (
              <g key={`lc${i}`}>
                {/* Shadow offset (sun from upper-left) */}
                <circle cx={cx + c.x * r + shadow} cy={cy + c.y * r + shadow}
                  r={cr} fill="#504a44" opacity={0.4} clipPath="url(#mCircle)" />
                {/* Crater floor */}
                <circle cx={cx + c.x * r} cy={cy + c.y * r}
                  r={cr * 0.78} fill="#8c8680" opacity={0.35} clipPath="url(#mCircle)" />
                {/* Bright rim highlight */}
                <circle cx={cx + c.x * r - shadow * 0.6} cy={cy + c.y * r - shadow * 0.6}
                  r={cr}
                  fill="none"
                  stroke="#d8d0c0"
                  strokeWidth={Math.max(0.6, cr * 0.18)}
                  opacity={0.28}
                  clipPath="url(#mCircle)" />
              </g>
            )
          })}

          {/* Limb darkening overlay */}
          <circle cx={cx} cy={cy} r={r} fill="url(#mLimb)" />
        </g>
      )}

      {/* Soft terminator blur strip (blended edge) */}
      {!isNew && !isFull && litPath && (
        <path d={litPath} fill="rgba(0,0,0,0.22)" filter="url(#mBlur)"
          clipPath="url(#mCircle)" style={{ mixBlendMode: 'multiply' }} />
      )}

      {/* Full moon atmospheric glow */}
      {isFull && <circle cx={cx} cy={cy} r={r + 10} fill="url(#mGlow)" />}

      {/* Rim */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={isFull ? 'rgba(255,255,220,0.15)' : 'rgba(255,255,255,0.06)'}
        strokeWidth="1" />
    </svg>
  )
}

export default function MoonPhase() {
  const [data, setData] = useState<MoonResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchMoon(controller.signal)
      .then((d) => {
        setData(d)
        setError(null)
        setLoading(false)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  useInterval(load, 10 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>🌙</span>
        <span className="card-title">Moon Phase</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="skeleton-block" style={{ height: '120px', width: '120px', borderRadius: '50%', margin: '0 auto' }} />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-text" style={{ width: i % 2 === 0 ? '60%' : '45%' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">Moon data unavailable — {error}</p>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <MoonSVG illumination={data.illumination} phaseName={data.phase_name} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
              {data.phase_name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Age: <span className="mono" style={{ color: 'var(--text)' }}>{data.age_days.toFixed(1)}</span> days
            </div>
          </div>

          {/* Illumination progress bar */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>Illumination</span>
              <span className="mono" style={{ color: 'var(--text)' }}>{data.illumination.toFixed(1)}%</span>
            </div>
            <div
              style={{
                height: '6px',
                background: 'var(--surface2)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${data.illumination}%`,
                  background: 'linear-gradient(90deg, #f0e6c8, #fff8e1)',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          <div style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>Distance</span>
              <span className="mono" style={{ color: 'var(--text)' }}>
                {data.distance_km.toLocaleString()} km
              </span>
            </div>
          </div>

          <hr className="divider" style={{ width: '100%' }} />

          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Upcoming Phases
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
              <PhaseRow label="New Moon" date={data.next_new_moon} />
              <PhaseRow label="First Quarter" date={data.next_first_quarter} />
              <PhaseRow label="Full Moon" date={data.next_full_moon} />
              <PhaseRow label="Last Quarter" date={data.next_last_quarter} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseRow({ label, date }: { label: string; date: string }) {
  const days = daysUntil(date)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formatDate(date)}</span>
        <span
          style={{
            fontSize: '0.65rem',
            background: 'var(--surface2)',
            color: 'var(--accent)',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
          }}
        >
          {days === 0 ? 'Today' : `${days}d`}
        </span>
      </span>
    </div>
  )
}
