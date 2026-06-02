import { useState, useEffect, useCallback } from 'react'
import { fetchPlanets, Planet } from '../api'
import { useInterval } from '../hooks/useInterval'

const PLANET_SYMBOLS: Record<string, string> = {
  Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '⛢',
  Neptune: '♆', Moon: '☽', Sun: '☀',
  Pluto: '♇', Ceres: '⚳', Haumea: '⚶',
  Makemake: '🝻', Eris: '⯰',
}

function formatMagnitude(mag: number | null | undefined): string {
  if (mag == null || isNaN(mag as number)) return '—'
  return mag >= 0 ? `+${mag.toFixed(1)}` : mag.toFixed(1)
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '—'
  try {
    const d = new Date(timeStr)
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
  } catch {
    return '—'
  }
}

function PlanetCard({ planet }: { planet: Planet }) {
  const isVisible = planet.altitude != null && planet.altitude > 0
  const symbol = PLANET_SYMBOLS[planet.name] || '★'

  return (
    <div style={{
      background: 'var(--surface2)',
      borderRadius: '10px',
      padding: '0.875rem',
      border: `1px solid ${isVisible ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
      opacity: isVisible ? 1 : 0.55,
      transition: 'opacity 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{symbol}</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{planet.name}</span>
        </div>
        {isVisible ? (
          <span className="badge badge-green">Visible</span>
        ) : (
          <span className="badge" style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Below horizon
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.75rem' }}>
        <DataRow label="Constellation" value={planet.constellation || '—'} />
        <DataRow label="Magnitude" value={formatMagnitude(planet.magnitude)} mono />
        <DataRow label="Altitude" value={planet.altitude != null ? `${planet.altitude.toFixed(1)}°` : '—'} mono />
        <DataRow label="Azimuth" value={planet.azimuth != null ? `${planet.azimuth.toFixed(1)}°` : '—'} mono />
        {!planet.is_dwarf_planet && <>
          <DataRow label="Rise" value={formatTime(planet.rise_time)} mono />
          <DataRow label="Set" value={formatTime(planet.set_time)} mono />
        </>}
      </div>
    </div>
  )
}

function DwarfCard({ planet }: { planet: Planet }) {
  const symbol = PLANET_SYMBOLS[planet.name] || '✦'
  const isVisible = planet.altitude != null && planet.altitude > 0
  return (
    <div style={{
      background: 'var(--surface2)',
      borderRadius: '8px',
      padding: '0.6rem 0.75rem',
      border: '1px solid var(--border)',
      opacity: 0.8,
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
    }}>
      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{symbol}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>{planet.name}</span>
          <span style={{ fontSize: '0.65rem', color: isVisible ? 'var(--accent3)' : 'var(--text-muted)' }}>
            {planet.altitude != null ? `${planet.altitude.toFixed(1)}° alt` : '—'}
          </span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
          {planet.constellation || '—'} · mag {formatMagnitude(planet.magnitude)} · telescope required
        </div>
      </div>
    </div>
  )
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span className={mono ? 'mono' : undefined} style={{ color: 'var(--text)', fontSize: '0.8rem' }}>
        {value}
      </span>
    </div>
  )
}

export default function Planets() {
  const [data, setData] = useState<Planet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [observerLocation, setObserverLocation] = useState<string>('')

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchPlanets(controller.signal)
      .then((d) => {
        setData(d.planets)
        setObserverLocation(d.observer_location)
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

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 10 * 60 * 1000)

  const mainBodies = data.filter(p => !p.is_dwarf_planet)
  const dwarfPlanets = data.filter(p => p.is_dwarf_planet)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>🌌</span>
        <span className="card-title">Galaxy Visibility</span>
        {observerLocation && (
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {observerLocation}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-block" style={{ height: '120px' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">Planet data unavailable — {error}</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            maxHeight: '420px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
            {mainBodies.map(planet => (
              <PlanetCard key={planet.name} planet={planet} />
            ))}
          </div>

          {dwarfPlanets.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
                Dwarf Planets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {dwarfPlanets.map(planet => (
                  <DwarfCard key={planet.name} planet={planet} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
