import { useState, useEffect, useCallback } from 'react'
import { fetchFeaturedTarget, FeaturedTargetResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

export default function FeaturedTarget() {
  const [data, setData] = useState<FeaturedTargetResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchFeaturedTarget(c.signal)
      .then(r => { setData(r); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 30 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🌌</span>
        <span className="card-title">Tonight's Featured Object</span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 200 }} />}

      {!loading && data?.target && (
        <div>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text)', margin: 0 }}>
            {data.target.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({data.target.id})</span>
          </h3>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {data.target.type} · {data.target.altitude_deg.toFixed(0)}° above horizon now · mag {data.target.mag}
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {data.target.blurb}
          </p>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.55, color: 'var(--text)', marginTop: '0.5rem', borderLeft: '2px solid var(--accent)', paddingLeft: '0.5rem' }}>
            <strong>How to find it:</strong> {data.target.tip}
          </p>
        </div>
      )}

      {!loading && data?.constellation && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {data.constellation.season} constellation
          </div>
          <h4 style={{ fontSize: '1rem', color: 'var(--text)', margin: '0 0 0.5rem' }}>
            {data.constellation.name}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 0.4rem' }}>
            <strong style={{ color: 'var(--text)' }}>Find it:</strong> {data.constellation.find_it}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 0.4rem' }}>
            <strong style={{ color: 'var(--text)' }}>Inside:</strong> {data.constellation.inside}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
            {data.constellation.mythology}
          </p>
        </div>
      )}
    </div>
  )
}
