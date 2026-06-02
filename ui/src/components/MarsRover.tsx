import { useState, useEffect, useCallback } from 'react'
import { fetchMarsRover, MarsRoverPhoto } from '../api'
import { useInterval } from '../hooks/useInterval'

export default function MarsRover() {
  const [photos, setPhotos] = useState<MarsRoverPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const c = new AbortController()
    fetchMarsRover(c.signal)
      .then(r => { setPhotos(r.photos || []); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 60 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🛻</span>
        <span className="card-title">From the Surface of Mars</span>
      </div>

      {loading && <div className="skeleton-block" style={{ height: 200 }} />}

      {!loading && photos.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No recent rover photos available.</p>
      )}

      {!loading && photos.length > 0 && (
        <div>
          <a href={photos[0].image_url} target="_blank" rel="noopener noreferrer">
            <img
              src={photos[0].image_url}
              alt={`${photos[0].rover} sol ${photos[0].sol}`}
              loading="lazy"
              style={{ width: '100%', borderRadius: 6, display: 'block', maxHeight: 320, objectFit: 'cover' }}
            />
          </a>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {photos[0].rover} · Sol {photos[0].sol} · {photos[0].earth_date}{photos[0].camera ? ` · ${photos[0].camera}` : ''}
          </p>
          {photos.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: 4, marginTop: '0.5rem' }}>
              {photos.slice(1).map(p => (
                <a key={p.image_url} href={p.image_url} target="_blank" rel="noopener noreferrer">
                  <img src={p.image_url} alt={`${p.rover} sol ${p.sol}`} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3, opacity: 0.75 }} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
