import { useState, useEffect, useCallback } from 'react'
import { fetchTonight, fetchClouds, TonightResponse, CloudsResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(mins: number): string {
  if (mins <= 0) return '0 min'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function cloudVerdict(clouds: CloudsResponse | null, tonight: TonightResponse | null): string | null {
  if (!clouds?.hourly?.length || !tonight?.good_window_start) return null
  const windowStart = new Date(tonight.good_window_start).getTime()
  const windowEnd = tonight.good_window_end ? new Date(tonight.good_window_end).getTime() : windowStart + 6 * 3600 * 1000
  const windowed = clouds.hourly.filter(h => {
    const t = new Date(h.time).getTime()
    return t >= windowStart && t <= windowEnd
  })
  if (!windowed.length) return null
  const avg = windowed.reduce((s, h) => s + (h.cloud_cover_pct ?? 0), 0) / windowed.length
  const min = Math.min(...windowed.map(h => h.cloud_cover_pct ?? 100))
  if (avg < 25) return `Clear skies in your viewing window (avg ${Math.round(avg)}% cloud).`
  if (avg < 60) return `Partly cloudy in your window (avg ${Math.round(avg)}% cloud, best ${Math.round(min)}%).`
  return `Heavily clouded tonight (avg ${Math.round(avg)}% cloud) — consider another night.`
}

export default function Tonight() {
  const [data, setData] = useState<TonightResponse | null>(null)
  const [clouds, setClouds] = useState<CloudsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const c = new AbortController()
    Promise.all([fetchTonight(c.signal), fetchClouds(c.signal).catch(() => null)])
      .then(([t, cl]) => { setData(t); setClouds(cl); setError(null); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false) } })
    return () => c.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])
  useInterval(load, 10 * 60 * 1000)

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>🌙</span>
        <span className="card-title">Tonight at Your Location</span>
        {data && (
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {data.observer_lat.toFixed(2)}°, {data.observer_lon.toFixed(2)}°
          </span>
        )}
      </div>

      {loading && <div className="skeleton-block" style={{ height: 120 }} />}

      {error && !loading && <p className="error-message">{error}</p>}

      {data && !loading && (
        <div>
          <p style={{ fontSize: '1rem', lineHeight: 1.5, color: 'var(--text)', marginBottom: '0.75rem' }}>
            {data.verdict}
          </p>
          {clouds && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {cloudVerdict(clouds, data) ?? ''}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <TonightStat label="Sunset"          value={fmtTime(data.sunset)} />
            <TonightStat label="Astro twilight ends" value={fmtTime(data.astro_twilight_end)} />
            <TonightStat label="Moonrise"        value={fmtTime(data.moonrise)} />
            <TonightStat label="Moonset"         value={fmtTime(data.moonset)} />
            <TonightStat label="Moon illum."     value={`${data.moon_illumination.toFixed(0)}%`} />
            <TonightStat label="Best window"     value={fmtDuration(data.good_window_minutes)} highlight />
          </div>
          {data.good_window_start && data.good_window_end && data.good_window_minutes > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Best stargazing: {fmtTime(data.good_window_start)} – {fmtTime(data.good_window_end)} local time
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TonightStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: '0.5rem 0.75rem', background: 'var(--surface-2, rgba(255,255,255,0.03))', borderRadius: 6, borderLeft: highlight ? '2px solid var(--accent3)' : '2px solid transparent' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div className="mono" style={{ fontSize: '1rem', color: highlight ? 'var(--accent3)' : 'var(--text)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
