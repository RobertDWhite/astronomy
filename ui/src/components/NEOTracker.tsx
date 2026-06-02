import { useState, useEffect, useCallback } from 'react'
import { fetchNEO, NEOObject } from '../api'
import { useInterval } from '../hooks/useInterval'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatKm(km: number): string {
  return Math.round(km).toLocaleString()
}

function cleanNeoName(name: string): string {
  if (!name) return name
  let s = name.replace(/^\(\d+\)\s*/, '')
  if (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1)
  return s
}

function DetailPanel({ neo }: { neo: NEOObject }) {
  const diameterM_min = Math.round(neo.diameter_min_km * 1000)
  const diameterM_max = Math.round(neo.diameter_max_km * 1000)

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '0.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '0.75rem',
        fontSize: '0.78rem',
      }}
    >
      <Stat label="Diameter" value={`${diameterM_min}–${diameterM_max} m`} />
      <Stat label="Miss Distance" value={`${formatKm(neo.miss_distance_km)} km`} />
      {neo.miss_distance_lunar != null && <Stat label="Lunar Distance" value={`${neo.miss_distance_lunar.toFixed(2)} LD`} />}
      {neo.miss_distance_au != null && <Stat label="Distance (AU)" value={`${neo.miss_distance_au.toFixed(4)} AU`} />}
      <Stat label="Velocity" value={`${neo.velocity_km_s.toFixed(2)} km/s`} />
      {neo.velocity_km_h != null && <Stat label="Velocity" value={`${neo.velocity_km_h.toLocaleString()} km/h`} />}
      <Stat label="Close Approach" value={neo.approach_datetime || formatDate(neo.approach_date)} />
      {neo.orbiting_body && <Stat label="Orbiting Body" value={neo.orbiting_body} />}
      <Stat label="Abs. Magnitude" value={neo.absolute_magnitude != null ? `H = ${neo.absolute_magnitude}` : '—'} />
      <Stat
        label="Hazard Status"
        value={neo.is_potentially_hazardous ? 'Potentially Hazardous' : 'Not Hazardous'}
        valueColor={neo.is_potentially_hazardous ? 'var(--red)' : 'var(--accent3)'}
      />
      {neo.is_sentry_object && (
        <Stat label="Sentry" value="Impact monitoring active" valueColor="var(--red)" />
      )}
      {neo.nasa_jpl_url && (
        <div style={{ gridColumn: '1 / -1' }}>
          <a
            href={neo.nasa_jpl_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'underline dotted' }}
          >
            View in NASA JPL Small Body Database →
          </a>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div className="mono" style={{ color: valueColor || 'var(--text)', fontSize: '0.82rem' }}>
        {value}
      </div>
    </div>
  )
}

export default function NEOTracker() {
  const [data, setData] = useState<NEOObject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchNEO(controller.signal)
      .then((d) => {
        const sorted = [...d.objects].sort(
          (a, b) => new Date(a.approach_date).getTime() - new Date(b.approach_date).getTime()
        )
        setData(sorted)
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
        <span style={{ fontSize: '1rem' }}>☄️</span>
        <span className="card-title">Near-Earth Objects</span>
        {!loading && !error && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {data.length} tracked · click for details
          </span>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-text" style={{ height: '2rem', width: '100%' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">NEO data unavailable — {error}</p>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="error-message">No near-earth objects found.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {/* Header row */}
          <div className="neo-table-header" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 130px 90px 60px 36px',
            gap: '0.5rem',
            padding: '0.3rem 0.5rem',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid var(--border)',
          }}>
            <span>Name</span>
            <span style={{ textAlign: 'right' }}>Diameter (km)</span>
            <span className="neo-col-miss" style={{ textAlign: 'right' }}>Miss Distance</span>
            <span className="neo-col-vel" style={{ textAlign: 'right' }}>Velocity</span>
            <span style={{ textAlign: 'right' }}>Date</span>
            <span className="neo-col-haz" style={{ textAlign: 'right' }}>⚠</span>
          </div>

          {data.map((neo) => {
            const isSelected = selectedId === neo.id
            return (
              <div key={neo.id}>
                <div
                  className="neo-table-row"
                  onClick={() => setSelectedId(isSelected ? null : neo.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 130px 90px 60px 36px',
                    gap: '0.5rem',
                    padding: '0.45rem 0.5rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    background: isSelected ? 'var(--surface2)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    color: 'var(--accent)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: isSelected ? 600 : 400,
                  }} title={neo.name}>
                    {cleanNeoName(neo.name)}
                  </span>
                  <span className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {neo.diameter_min_km.toFixed(2)}–{neo.diameter_max_km.toFixed(2)}
                  </span>
                  <span className="neo-col-miss mono" style={{ textAlign: 'right', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {formatKm(neo.miss_distance_km)} km
                  </span>
                  <span className="neo-col-vel mono" style={{ textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {neo.velocity_km_s.toFixed(2)} km/s
                  </span>
                  <span style={{ textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {formatDate(neo.approach_date)}
                  </span>
                  <span className="neo-col-haz" style={{ textAlign: 'right' }}>
                    {neo.is_potentially_hazardous
                      ? <span className="badge badge-red">PHO</span>
                      : neo.noteworthy
                        ? <span style={{ display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 3, background: 'rgba(96,165,250,0.15)', color: 'var(--accent)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em' }} title={neo.noteworthy_reason || undefined}>NOTABLE</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    }
                  </span>
                </div>

                {isSelected && <DetailPanel neo={neo} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
