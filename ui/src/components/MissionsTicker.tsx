import { useState, useEffect, useCallback } from 'react'
import { fetchMissions, Mission } from '../api'
import { useInterval } from '../hooks/useInterval'

function fmtKm(km: number): string {
  if (km > 1e9) return `${(km / 1e9).toFixed(2)} B km`
  if (km > 1e6) return `${(km / 1e6).toFixed(1)} M km`
  if (km > 1e3) return `${(km / 1e3).toFixed(0)} K km`
  return `${km.toFixed(0)} km`
}

export default function MissionsTicker() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchMissions(c.signal)
      .then(r => { setMissions(r.missions || []); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 60 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🚀</span>
        <span className="card-title">Right Now in Space</span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 220 }} />}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {missions.map(m => (
            <div key={m.id} style={{ paddingBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600 }}>{m.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.agency}</span>
              </div>
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent3)', marginTop: 2 }}>
                {fmtKm(m.distance_km)} · light delay {m.light_delay_human}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
