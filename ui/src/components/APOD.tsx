import { useState, useEffect, useCallback } from 'react'
import { fetchAPOD, APODResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

export default function APOD() {
  const [data, setData] = useState<APODResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchAPOD(controller.signal)
      .then((d) => {
        setData(d)
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

  // APOD changes daily — 10 min refresh is fine
  useInterval(load, 10 * 60 * 1000)

  const TRUNCATE_LENGTH = 400

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>✦</span>
        <span className="card-title">Astronomy Picture of the Day</span>
        {data && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {data.date}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-block" style={{ height: '360px', width: '100%' }} />
          <div className="skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton-text" style={{ width: '90%' }} />
          <div className="skeleton-text" style={{ width: '80%' }} />
        </div>
      )}

      {error && !loading && (
        <p className="error-message">Unable to load picture of the day — NASA API temporarily unavailable</p>
      )}

      {data && !loading && !data.title && (
        <p className="error-message">Unable to load picture of the day — NASA API may be temporarily unavailable</p>
      )}

      {data && !loading && data.title && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.media_type === 'image' ? (
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
              <img
                src={data.hdurl || data.url}
                alt={data.title}
                style={{
                  width: '100%',
                  maxHeight: '480px',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: '8px',
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '8px', overflow: 'hidden' }}>
              <iframe
                src={data.url}
                title={data.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px',
                }}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>
              {data.title}
            </h2>
            {data.copyright && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                © {data.copyright}
              </p>
            )}
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              {data.explanation
                ? (expanded || data.explanation.length <= TRUNCATE_LENGTH
                    ? data.explanation
                    : data.explanation.slice(0, TRUNCATE_LENGTH) + '…')
                : ''}
            </p>
            {(data.explanation?.length ?? 0) > TRUNCATE_LENGTH && (
              <button
                onClick={() => setExpanded((e) => !e)}
                style={{
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: 0,
                }}
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
