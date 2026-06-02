import { useState, useEffect, useCallback } from 'react'
import { fetchLaunches, Launch } from '../api'
import { useInterval } from '../hooks/useInterval'

function getStatusClass(status: string): string {
  const s = status.toLowerCase()
  if (s === 'go' || s === 'success') return 'badge-green'
  if (s === 'hold' || s === 'failure') return 'badge-red'
  if (s === 'in flight') return 'badge-blue'
  return 'badge-yellow'
}

function getCountdown(netStr: string): string {
  const net = new Date(netStr)
  const now = new Date()
  const diff = net.getTime() - now.getTime()

  if (diff <= 0) return 'T+00:00:00'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `T-${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `T-${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function LaunchDetail({ launch }: { launch: Launch }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {launch.image_url && (
        <img
          src={launch.image_url}
          alt={launch.name}
          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}

      {launch.mission_description && (
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            Mission
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
            {launch.mission_description}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', fontSize: '0.78rem' }}>
        <DetailStat label="Provider" value={launch.provider} />
        <DetailStat label="Vehicle" value={launch.vehicle} />
        <DetailStat label="Launch Pad" value={launch.pad} />
        {launch.location && <DetailStat label="Location" value={launch.location} />}
        <DetailStat label="NET" value={new Date(launch.net).toLocaleString('en-US', { timeZoneName: 'short' })} />
        {launch.viewable_from_observer && launch.viewable_note && (
          <DetailStat label="Visibility" value={launch.viewable_note} />
        )}
      </div>

      {launch.url && (
        <a
          href={launch.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'underline dotted', alignSelf: 'flex-start' }}
        >
          Watch / More Info →
        </a>
      )}
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ color: 'var(--text)', fontSize: '0.82rem' }}>{value || '—'}</div>
    </div>
  )
}

function LaunchCard({ launch, isSelected, onToggle }: { launch: Launch; isSelected: boolean; onToggle: () => void }) {
  const [, setTick] = useState(0)
  useInterval(() => setTick((t) => t + 1), 1000)

  const countdown = getCountdown(launch.net)
  const isPast = new Date(launch.net) < new Date()

  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          background: 'var(--surface2)',
          borderRadius: '8px',
          padding: '0.875rem',
          borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.3 }}>
            {launch.name}
          </div>
          <span className={`badge ${getStatusClass(launch.status)}`} style={{ flexShrink: 0 }}>
            {launch.status}
          </span>
        </div>
        {launch.viewable_from_observer && (
          <div style={{ fontSize: '0.7rem', color: 'var(--accent3)', padding: '0.3rem 0.5rem', background: 'rgba(34,197,94,0.08)', borderRadius: 4, marginBottom: '0.5rem', borderLeft: '2px solid var(--accent3)' }}>
            👁 Maybe visible from your location · {launch.viewable_note}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
          <div style={{ color: 'var(--text-muted)' }}>
            Provider: <span style={{ color: 'var(--text)' }}>{launch.provider}</span>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            Vehicle: <span style={{ color: 'var(--text)' }}>{launch.vehicle}</span>
          </div>
          <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            Pad: <span style={{ color: 'var(--text)' }}>{launch.pad}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {isSelected ? '▲ hide details' : '▼ show details'}
          </span>
          <span
            className="mono"
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: isPast ? 'var(--text-muted)' : 'var(--accent3)',
              letterSpacing: '0.05em',
            }}
          >
            {isPast ? 'Launched' : countdown}
          </span>
        </div>
      </div>

      {isSelected && <LaunchDetail launch={launch} />}
    </div>
  )
}

export default function Launches() {
  const [data, setData] = useState<Launch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchLaunches(controller.signal)
      .then((d) => {
        setData(d.launches)
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

  useInterval(load, 10 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>🚀</span>
        <span className="card-title">Upcoming Launches</span>
        {!loading && !error && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {data.length} upcoming
          </span>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-block" style={{ height: '100px' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">Launch data unavailable — {error}</p>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="error-message">No upcoming launches found.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
          {data.map((launch) => (
            <LaunchCard
              key={launch.id}
              launch={launch}
              isSelected={selectedId === launch.id}
              onToggle={() => setSelectedId(selectedId === launch.id ? null : launch.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
