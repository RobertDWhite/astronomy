import { useState, useEffect } from 'react'
import { fetchTonight, TonightResponse } from '../api'

// Top-down Milky Way map — pure SVG, no API needed (galactic structure is static)

const SVG_W = 900
const SVG_H = 360
const CX = SVG_W / 2
const CY = SVG_H / 2

// Sun is ~26,000 ly from galactic center; galaxy radius ~50,000 ly → ~52% out
// Placed lower-right of center in standard galactic top-down orientation
const SUN_X = CX + 78
const SUN_Y = CY + 62

const OUTER_R = 158  // galaxy edge in SVG px
const INNER_R = 22   // bar edge where arms emerge

// Generate points along a logarithmic spiral arm
function armPoints(
  startAngle: number,
  cx: number,
  cy: number,
  rMin: number,
  rMax: number,
  turns: number,
  n: number
): { x: number; y: number; t: number }[] {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const theta = startAngle - t * turns * 2 * Math.PI  // clockwise spiral
    const r = rMin + t * (rMax - rMin)
    pts.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta), t })
  }
  return pts
}

// Convert point array to smooth SVG path string
function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return d
}

// Four main arms + Orion spur
const ARM_CONFIGS = [
  { name: 'Scutum–Centaurus', startAngle: 0.18,  color: '#7090d8', width: 18, opacity: 0.55 },
  { name: 'Perseus',          startAngle: 0.18 + Math.PI, color: '#6080cc', width: 16, opacity: 0.50 },
  { name: 'Sagittarius',      startAngle: 0.18 + Math.PI / 2,         color: '#8898cc', width: 13, opacity: 0.42 },
  { name: 'Norma',            startAngle: 0.18 + Math.PI * 3 / 2,     color: '#7888c0', width: 11, opacity: 0.36 },
]

// Orion Spur: short arm segment where our solar system lives
const ORION_START_ANGLE = 0.18 + Math.PI / 2 + 0.6  // offset from Sagittarius
const ORION_PTS = armPoints(ORION_START_ANGLE, CX, CY, 60, 105, 0.35, 20)

// Star field — deterministic pseudo-random
const STARS = Array.from({ length: 180 }, (_, i) => ({
  x: (i * 137.508 + 11) % SVG_W,
  y: (i * 97.32 + 53)  % SVG_H,
  r: 0.3 + (i % 5) * 0.18,
  o: 0.15 + (i % 7) * 0.07,
}))

function azToDir(az: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return points[Math.round((az / 45)) % 8]
}

export default function MilkyWay() {
  const arms = ARM_CONFIGS.map(cfg => ({
    ...cfg,
    pts: armPoints(cfg.startAngle, CX, CY, INNER_R, OUTER_R, 1.75, 60),
  }))

  const [gcAlt, setGcAlt] = useState<number | null>(null)
  const [gcAz, setGcAz] = useState<number | null>(null)

  useEffect(() => {
    const c = new AbortController()
    fetchTonight(c.signal)
      .then((t: TonightResponse) => {
        if (t.galactic_center_alt_deg != null) setGcAlt(t.galactic_center_alt_deg)
        if (t.galactic_center_az_deg != null) setGcAz(t.galactic_center_az_deg)
      })
      .catch(() => {})
    return () => c.abort()
  }, [])

  const annotation: string | null = (() => {
    if (gcAlt == null || gcAz == null) return null
    if (gcAlt < 0) return `The Milky Way's core is below your horizon right now — best viewing returns when it rises in the ${azToDir(gcAz)}.`
    if (gcAlt < 15) return `The galactic core is just above the horizon to the ${azToDir(gcAz)} — atmospheric haze makes it tough.`
    if (gcAlt < 30) return `The galactic core sits low (${gcAlt.toFixed(0)}°) to the ${azToDir(gcAz)}. Try a dark site with a clear southern view.`
    return `The galactic core is well up (${gcAlt.toFixed(0)}°) to the ${azToDir(gcAz)} right now — prime time from a dark sky.`
  })()

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>🌌</span>
        <span className="card-title">Milky Way — Our Galactic Neighborhood</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Top-Down View · Not to Scale
        </span>
      </div>
      {annotation && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: '0 0 0.75rem', padding: '0.4rem 0.6rem', background: 'rgba(96,165,250,0.06)', borderLeft: '2px solid var(--accent)', borderRadius: 3 }}>
          {annotation}
        </p>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block', borderRadius: '8px' }}
      >
        <defs>
          {/* Arm glow blur */}
          <filter id="armBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          {/* Tight arm core blur */}
          <filter id="coreBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          {/* Galactic halo blur */}
          <filter id="haloBlur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="28" />
          </filter>
          {/* Sun glow */}
          <filter id="sunBlur" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {/* Bulge glow */}
          <radialGradient id="bulgeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffe8a0" stopOpacity="0.95" />
            <stop offset="30%"  stopColor="#e8c060" stopOpacity="0.7" />
            <stop offset="65%"  stopColor="#c09040" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#806030" stopOpacity="0" />
          </radialGradient>
          {/* Outer disk halo */}
          <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#404870" stopOpacity="0" />
            <stop offset="60%"  stopColor="#303860" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1a2040" stopOpacity="0" />
          </radialGradient>
          <clipPath id="mwClip">
            <rect width={SVG_W} height={SVG_H} />
          </clipPath>
        </defs>

        {/* Space background */}
        <rect width={SVG_W} height={SVG_H} fill="#06080f" rx="8" />

        {/* Stars */}
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
        ))}

        {/* Outer disk halo */}
        <ellipse cx={CX} cy={CY} rx={OUTER_R * 1.25} ry={OUTER_R * 0.9}
          fill="url(#haloGrad)" filter="url(#haloBlur)" />

        {/* Spiral arms — wide glow pass */}
        {arms.map(arm => (
          <path key={`glow-${arm.name}`}
            d={pointsToPath(arm.pts)}
            fill="none"
            stroke={arm.color}
            strokeWidth={arm.width * 2.2}
            strokeLinecap="round"
            opacity={arm.opacity * 0.45}
            filter="url(#armBlur)"
            clipPath="url(#mwClip)"
          />
        ))}

        {/* Spiral arms — tight core pass */}
        {arms.map(arm => (
          <path key={`core-${arm.name}`}
            d={pointsToPath(arm.pts)}
            fill="none"
            stroke={arm.color}
            strokeWidth={arm.width * 0.7}
            strokeLinecap="round"
            opacity={arm.opacity * 0.9}
            filter="url(#coreBlur)"
            clipPath="url(#mwClip)"
          />
        ))}

        {/* Orion Spur — our local arm segment */}
        <path
          d={pointsToPath(ORION_PTS)}
          fill="none"
          stroke="#a0b8e8"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={0.38}
          filter="url(#armBlur)"
          clipPath="url(#mwClip)"
        />
        <path
          d={pointsToPath(ORION_PTS)}
          fill="none"
          stroke="#b0c8f0"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.55}
          filter="url(#coreBlur)"
          clipPath="url(#mwClip)"
        />

        {/* Galactic bar */}
        <ellipse cx={CX} cy={CY} rx={46} ry={18}
          fill="#d0a040" opacity={0.35} filter="url(#coreBlur)"
          transform={`rotate(-28 ${CX} ${CY})`} />

        {/* Central bulge */}
        <ellipse cx={CX} cy={CY} rx={52} ry={40}
          fill="url(#bulgeGrad)" />
        <ellipse cx={CX} cy={CY} rx={26} ry={20}
          fill="#fff4c0" opacity={0.55} filter="url(#coreBlur)" />

        {/* Sun marker */}
        {/* Glow ring */}
        <circle cx={SUN_X} cy={SUN_Y} r={7} fill="#ffe060" opacity={0.25} filter="url(#sunBlur)" />
        {/* Dot */}
        <circle cx={SUN_X} cy={SUN_Y} r={3} fill="#ffe060" />
        <circle cx={SUN_X} cy={SUN_Y} r={3} fill="none" stroke="#fff8c0" strokeWidth="0.8" opacity={0.8} />

        {/* Sun label */}
        <text x={SUN_X + 6} y={SUN_Y - 5}
          fill="#ffe060" fontSize="9" fontFamily="system-ui, sans-serif"
          fontWeight="600" opacity={0.95}>
          ☀ You are here
        </text>

        {/* Galactic center label */}
        <text x={CX + 2} y={CY - 48}
          fill="#e8c060" fontSize="8.5" fontFamily="system-ui, sans-serif"
          textAnchor="middle" opacity={0.7}>
          Galactic Center
        </text>
        <line x1={CX} y1={CY - 42} x2={CX} y2={CY - 28}
          stroke="#e8c060" strokeWidth="0.8" opacity={0.4}
          strokeDasharray="2,2" />

        {/* Arm labels */}
        <text x={CX - 148} y={CY + 30}
          fill="#8090c8" fontSize="7.5" fontFamily="system-ui, sans-serif" opacity={0.7}>
          Perseus Arm
        </text>
        <text x={CX + 60} y={CY - 95}
          fill="#7888c0" fontSize="7.5" fontFamily="system-ui, sans-serif" opacity={0.65}>
          Norma Arm
        </text>
        <text x={CX + 110} y={CY + 105}
          fill="#8090c8" fontSize="7.5" fontFamily="system-ui, sans-serif" opacity={0.65}>
          Scutum–Centaurus Arm
        </text>
        <text x={SUN_X - 72} y={SUN_Y + 26}
          fill="#a0b8e8" fontSize="7.5" fontFamily="system-ui, sans-serif" opacity={0.75}>
          Orion Spur (Local Arm)
        </text>

        {/* Distance scale — 10,000 ly */}
        {(() => {
          const scalePx = OUTER_R * (10000 / 50000)  // 10k ly in px
          const sx = 30, sy = SVG_H - 22
          return (
            <g>
              <line x1={sx} y1={sy} x2={sx + scalePx} y2={sy}
                stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1={sx} y1={sy - 3} x2={sx} y2={sy + 3}
                stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1={sx + scalePx} y1={sy - 3} x2={sx + scalePx} y2={sy + 3}
                stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <text x={sx + scalePx / 2} y={sy - 5}
                textAnchor="middle" fill="rgba(255,255,255,0.4)"
                fontSize="7.5" fontFamily="system-ui, sans-serif">
                10,000 ly
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
