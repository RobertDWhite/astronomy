import { useState, useEffect, useCallback } from 'react'
import { fetchSatellitePasses, SatellitePass } from '../api'
import { useInterval } from '../hooks/useInterval'

function fmtPassTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

function magLabel(mag: number): string {
  if (mag <= -3) return 'Very bright'
  if (mag <= -1) return 'Bright'
  if (mag <= 2) return 'Visible'
  return 'Faint'
}

function altLabel(alt: number): string {
  if (alt > 70) return 'overhead'
  if (alt > 40) return 'high'
  if (alt > 20) return 'mid-sky'
  return 'low'
}

export default function SatellitePasses() {
  const [passes, setPasses] = useState<SatellitePass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchSatellitePasses(c.signal)
      .then(r => { setPasses(r.passes || []); setError(null); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false) } })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 15 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🛰</span>
        <span className="card-title">Visible Station Passes</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          ISS · Tiangong · next 5 days
        </span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 200 }} />}
      {error && !loading && <p className="error-message">{error}</p>}

      {!loading && !error && passes.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No visible passes in the next 5 days. The stations will still be flying — just not lit by the sun while it's dark for you.
        </p>
      )}

      {!loading && passes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {passes.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.5rem 0', borderBottom: i < passes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent3)', fontWeight: 700, width: 70 }}>{p.satellite}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                  {fmtPassTime(p.rise_time)} — rises {p.rise_direction}, peaks {altLabel(p.peak_altitude_deg)} ({p.peak_altitude_deg.toFixed(0)}°), sets {p.set_direction}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {magLabel(p.approx_magnitude)} (mag {p.approx_magnitude.toFixed(1)}) · {Math.round(p.duration_seconds / 60)} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
