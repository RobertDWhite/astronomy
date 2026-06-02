import { useState, useEffect } from 'react'
import { fetchAPODWeek, APODWeekItem } from '../api'

export default function APODWeekStrip() {
  const [days, setDays] = useState<APODWeekItem[]>([])

  useEffect(() => {
    const c = new AbortController()
    fetchAPODWeek(c.signal)
      .then(r => setDays(r.days || []))
      .catch(() => {})
    return () => c.abort()
  }, [])

  if (!days.length) return null

  return (
    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 4 }}>
      {days.map(d => (
        <a key={d.date} href={d.hdurl || d.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ aspectRatio: '4/3', background: '#0a0e18', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            {d.media_type === 'image' && (
              <img src={d.url} alt={d.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
            {d.media_type === 'video' && d.thumbnail_url && (
              <img src={d.thumbnail_url} alt={d.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.7 }} />
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.2rem 0.3rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', fontSize: '0.55rem', color: 'rgba(255,255,255,0.8)' }}>
              {d.date}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}
