import { useState, useEffect, useCallback } from 'react'
import { useInterval } from '../hooks/useInterval'

interface SolarBody {
  name: string
  distance_au: number
  hlong_deg: number
  x: number
  y: number
  color: string
  size: number
  orbit_au?: number
  is_dwarf?: boolean
}

interface SolarSystemResponse {
  computed_at: string
  bodies: SolarBody[]
}

async function fetchSolarSystem(): Promise<SolarSystemResponse> {
  const res = await fetch('/api/solar-system')
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

function scaleAU(distAu: number, maxR: number, maxDist: number): number {
  return maxR * (Math.log(1 + distAu) / Math.log(1 + maxDist))
}

// Classic planet semi-major axes for orbit rings
const PLANET_ORBITS = [0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.19, 30.07]
// Dwarf planet semi-major axes for faint orbit rings (desktop only)
const DWARF_ORBITS  = [2.767, 39.48, 43.12, 45.79, 67.78]

export default function SolarSystem() {
  const [data, setData] = useState<SolarSystemResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 700)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const load = useCallback(() => {
    fetchSolarSystem()
      .then((d) => { setData(d); setError(null); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])
  useInterval(load, 10 * 60 * 1000)

  // On mobile: square SVG zoomed to Neptune's orbit; desktop: wide landscape covering all dwarfs
  const svgW = 1000
  const svgH = isMobile ? 1000 : 300
  const cx = svgW / 2
  const cy = svgH / 2
  const maxR = Math.min(svgW, svgH) / 2 - 16
  const maxDist = isMobile ? 32 : 100

  // Scale factors so dots and labels are legible at 360px screen width
  const dotScale  = isMobile ? 4   : 1
  const fontNorm  = isMobile ? 36  : 7.5
  const fontHov   = isMobile ? 44  : 9
  const labelPad  = isMobile ? 44  : 10
  const sunR      = isMobile ? 28  : 10
  const sunGlow   = isMobile ? 64  : 22

  const mainBodies  = data?.bodies.filter(b => !b.is_dwarf) ?? []
  const dwarfBodies = data?.bodies.filter(b => b.is_dwarf)  ?? []

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>🌌</span>
        <span className="card-title">Solar System — Current Positions</span>
        {data && (
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Heliocentric · Top-Down View
          </span>
        )}
      </div>

      {loading && (
        <div className="skeleton-block" style={{ height: svgH, borderRadius: '12px' }} />
      )}

      {error && !loading && (
        <p className="error-message">Solar system data unavailable — {error}</p>
      )}

      {data && !loading && (
        <div className="solar-layout" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div className="solar-svg-wrap" style={{ flex: '1 1 0', minWidth: 0 }}>
          <svg
            width="100%"
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ display: 'block' }}
          >
            {/* Space background */}
            <rect width={svgW} height={svgH} fill="#060912" rx="12" />

            {/* Star field */}
            {Array.from({ length: 120 }, (_, i) => {
              const sx = (i * 137.5) % svgW
              const sy = (i * 97.3 + 41) % svgH
              const sr = (isMobile ? 1.5 : 0.4) + (i % 3) * (isMobile ? 1 : 0.3)
              return <circle key={i} cx={sx} cy={sy} r={sr} fill="white" opacity={0.2 + (i % 4) * 0.1} />
            })}

            {/* Dwarf planet orbit rings — desktop only, very faint */}
            {!isMobile && DWARF_ORBITS.map((au, i) => {
              const r = scaleAU(au, maxR, maxDist)
              return (
                <circle key={`dw-orb-${i}`} cx={cx} cy={cy} r={r}
                  fill="none" stroke="rgba(255,255,255,0.03)"
                  strokeWidth="1" strokeDasharray="1,5" />
              )
            })}

            {/* Classic planet orbit rings */}
            {PLANET_ORBITS.map((au, i) => {
              const r = scaleAU(au, maxR, maxDist)
              if (r > maxR) return null
              return (
                <circle key={`orb-${i}`} cx={cx} cy={cy} r={r}
                  fill="none" stroke="rgba(255,255,255,0.06)"
                  strokeWidth={isMobile ? 2 : 1}
                  strokeDasharray={i >= 4 ? '3,4' : '2,3'} />
              )
            })}

            {/* Sun */}
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff7a1" />
                <stop offset="40%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r={sunGlow} fill="url(#sunGlow)" opacity="0.25" />
            <circle cx={cx} cy={cy} r={sunR} fill="#ffd700" />
            <circle cx={cx} cy={cy} r={sunR + 5} fill="none" stroke="#ffd700" strokeWidth={isMobile ? 3 : 1} opacity="0.4" />

            {/* Dwarf planets — desktop only (they're beyond Neptune so off-screen on mobile zoom) */}
            {!isMobile && dwarfBodies.map((body) => {
              const r = scaleAU(body.distance_au, maxR, maxDist)
              const angleRad = (body.hlong_deg * Math.PI) / 180
              const px = cx + r * Math.cos(angleRad)
              const py = cy - r * Math.sin(angleRad)
              const isHovered = hovered === body.name
              const dotSize = body.size * (isHovered ? 1.8 : 1)
              const lx = px + (dotSize + 8) * Math.cos(angleRad)
              const ly = py - (dotSize + 8) * Math.sin(angleRad)
              return (
                <g key={body.name}
                  onMouseEnter={() => setHovered(body.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'default' }}
                >
                  {isHovered && <circle cx={px} cy={py} r={dotSize + 5} fill={body.color} opacity={0.15} />}
                  <circle cx={px} cy={py} r={dotSize} fill={body.color} opacity={0.75} />
                  <text x={lx} y={ly}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={body.color} fontSize={isHovered ? 7.5 : 6}
                    fontFamily="system-ui, sans-serif"
                    opacity={isHovered ? 0.9 : 0.55}
                  >
                    {body.name}
                  </text>
                </g>
              )
            })}

            {/* Main planets */}
            {mainBodies.map((body) => {
              const r = scaleAU(body.distance_au, maxR, maxDist)
              const angleRad = (body.hlong_deg * Math.PI) / 180
              const px = cx + r * Math.cos(angleRad)
              const py = cy - r * Math.sin(angleRad)
              const isHovered = hovered === body.name
              const dotSize = body.size * dotScale * (isHovered ? 1.5 : 1)
              const lx = px + (dotSize + labelPad) * Math.cos(angleRad)
              const ly = py - (dotSize + labelPad) * Math.sin(angleRad)
              return (
                <g key={body.name}
                  onMouseEnter={() => setHovered(body.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'default' }}
                >
                  {isHovered && <circle cx={px} cy={py} r={dotSize + (isMobile ? 18 : 6)} fill={body.color} opacity={0.2} />}
                  <circle cx={px} cy={py} r={dotSize} fill={body.color} />
                  <text x={lx} y={ly}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={body.color} fontSize={isHovered ? fontHov : fontNorm}
                    fontWeight={isHovered ? 700 : 500}
                    fontFamily="system-ui, sans-serif"
                    opacity={isHovered ? 1 : 0.85}
                  >
                    {body.name}
                  </text>
                </g>
              )
            })}
          </svg>
          </div>

          {/* Data table */}
          <div className="solar-sidebar" style={{ flex: '0 0 200px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
              Current Positions
            </div>
            <div className="solar-body-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {mainBodies.map((body) => (
                <BodyRow key={body.name} body={body} hovered={hovered === body.name}
                  onEnter={() => setHovered(body.name)} onLeave={() => setHovered(null)} />
              ))}
              {dwarfBodies.length > 0 && (
                <>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.4rem', marginBottom: '0.1rem', opacity: 0.7, gridColumn: '1 / -1' }}>
                    Dwarf Planets
                  </div>
                  {dwarfBodies.map((body) => (
                    <BodyRow key={body.name} body={body} hovered={hovered === body.name} dim
                      onEnter={() => setHovered(body.name)} onLeave={() => setHovered(null)} />
                  ))}
                </>
              )}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.5, gridColumn: '1 / -1' }}>
              Scale is logarithmic.<br />Positions are heliocentric.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BodyRow({ body, hovered, dim, onEnter, onLeave }: {
  body: SolarBody; hovered: boolean; dim?: boolean
  onEnter: () => void; onLeave: () => void
}) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: dim ? '0.72rem' : '0.78rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '6px',
        background: hovered ? 'var(--surface2)' : 'transparent',
        opacity: dim ? 0.7 : 1,
      }}
      onMouseEnter={onEnter} onMouseLeave={onLeave}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
        <span style={{ width: dim ? 6 : 8, height: dim ? 6 : 8, borderRadius: '50%', background: body.color, display: 'inline-block', flexShrink: 0 }} />
        {body.name}
      </span>
      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: dim ? '0.68rem' : '0.73rem' }}>
        {body.distance_au.toFixed(2)} AU
      </span>
    </div>
  )
}
