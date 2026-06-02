import { useState, useEffect, useCallback } from 'react'
import { fetchPlanets, Planet } from '../api'
import { useInterval } from '../hooks/useInterval'

const ICON: Record<string, string> = {
  Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄',
  Uranus: '⛢', Neptune: '♆', Pluto: '♇',
}

function azToDir(az: number): string {
  const points = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
  return points[Math.round((az / 45)) % 8]
}

function brightnessWord(mag: number): string {
  if (mag <= -3) return 'blazingly bright'
  if (mag <= -1) return 'very bright'
  if (mag <= 1) return 'bright'
  if (mag <= 3) return 'easily seen'
  if (mag <= 5.5) return 'visible to the naked eye'
  return 'binocular target'
}

function sentenceFor(p: Planet): string | null {
  if (p.altitude <= 0) return null
  const dir = azToDir(p.azimuth)
  const verb = p.altitude > 60 ? 'is high overhead' : p.altitude > 30 ? 'sits' : 'is low'
  return `${p.name} ${verb} to the ${dir} (${p.altitude.toFixed(0)}° up), ${brightnessWord(p.magnitude)} at mag ${p.magnitude.toFixed(1)}.`
}

export default function VisiblePlanets() {
  const [planets, setPlanets] = useState<Planet[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchPlanets(c.signal)
      .then(r => { setPlanets(r.planets || []); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 5 * 60 * 1000)

  const planetsOnly = planets.filter(p => !p.is_dwarf_planet && !['Sun', 'Moon'].includes(p.name))
  const visible = planetsOnly.filter(p => p.altitude > 0).sort((a, b) => b.altitude - a.altitude)
  const hidden = planetsOnly.filter(p => p.altitude <= 0)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🪐</span>
        <span className="card-title">Visible Planets Right Now</span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 160 }} />}

      {!loading && visible.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No planets above the horizon right now. Check back at a different time.
        </p>
      )}

      {!loading && visible.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {visible.map(p => (
            <div key={p.name} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1rem', color: 'var(--accent3)', width: 18, textAlign: 'center' }}>{ICON[p.name] || '·'}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4 }}>{sentenceFor(p)}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && hidden.length > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
          Below the horizon: {hidden.map(p => p.name).join(', ')}
        </p>
      )}
    </div>
  )
}
