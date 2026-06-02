import { useState, useEffect, useCallback } from 'react'
import { fetchComets, Comet } from '../api'
import { useInterval } from '../hooks/useInterval'

function badgeFor(v: Comet['visibility']): { label: string; color: string } {
  switch (v) {
    case 'naked_eye':       return { label: 'NAKED EYE', color: 'var(--accent3)' }
    case 'binocular':       return { label: 'BINOCULAR', color: 'var(--accent)' }
    case 'small_telescope': return { label: 'TELESCOPE', color: 'var(--text-muted)' }
    default:                return { label: 'FAINT',     color: 'var(--text-muted)' }
  }
}

export default function Comets() {
  const [data, setData] = useState<{ comets: Comet[]; headline: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchComets(c.signal)
      .then(r => { setData(r); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 60 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>☄</span>
        <span className="card-title">Currently Visible Comets</span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 120 }} />}

      {!loading && data && (
        <>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text)' }}>{data.headline}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.comets.slice(0, 4).map(c => {
              const b = badgeFor(c.visibility)
              return (
                <div key={c.designation} style={{ padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: '0.6rem', color: b.color, fontWeight: 700, letterSpacing: '0.06em' }}>
                      {b.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>mag {c.magnitude.toFixed(1)}</span>
                  </div>
                  {c.constellation && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      In {c.constellation} · {c.altitude_deg > 0 ? `${c.altitude_deg.toFixed(0)}° above horizon` : 'below horizon now'}
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.note}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
