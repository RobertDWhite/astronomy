import { useState, useEffect, useCallback } from 'react'
import { fetchEPIC, EPICResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

export default function EarthFromSpace() {
  const [data, setData] = useState<EPICResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchEPIC(c.signal)
      .then(r => { setData(r); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 6 * 60 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🌍</span>
        <span className="card-title">Earth, Right Now</span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 280, aspectRatio: '1' }} />}

      {!loading && data?.image_url && (
        <div>
          <img
            src={data.image_url}
            alt="Latest Earth from DSCOVR EPIC"
            loading="lazy"
            style={{ width: '100%', borderRadius: 6, display: 'block', aspectRatio: '1', objectFit: 'cover' }}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {data.date} · {data.source}
          </p>
        </div>
      )}

      {!loading && !data?.image_url && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>EPIC image unavailable right now.</p>
      )}
    </div>
  )
}
