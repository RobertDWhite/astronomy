import { useState, useEffect, useCallback } from 'react'
import { fetchAurora, AuroraResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

function chanceColor(c: AuroraResponse['chance']): string {
  switch (c) {
    case 'high':     return 'var(--accent3)'
    case 'moderate': return 'var(--accent)'
    case 'low':      return 'var(--text-muted)'
    default:         return 'var(--text-muted)'
  }
}

export default function AuroraOutlook() {
  const [data, setData] = useState<AuroraResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchAurora(c.signal)
      .then(r => { setData(r); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 15 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🌌</span>
        <span className="card-title">Aurora Outlook</span>
        {data && (
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            lat {data.observer_lat.toFixed(1)}°
          </span>
        )}
      </div>

      {loading && <div className="skeleton-block" style={{ height: 120 }} />}

      {!loading && data && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', color: chanceColor(data.chance), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {data.chance}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Kp {data.current_kp.toFixed(1)} now · threshold Kp {data.threshold_kp}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            {data.message}
          </p>
          {data.forecast.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                3-day forecast
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {data.forecast.map(f => (
                  <div key={f.date} style={{ flex: 1, padding: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(f.date).toLocaleDateString([], { weekday: 'short' })}
                    </div>
                    <div className="mono" style={{ fontSize: '0.9rem', color: chanceColor(f.chance_at_location as AuroraResponse['chance']), fontWeight: 600 }}>
                      Kp {f.peak_kp.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
