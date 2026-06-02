import { useState, useEffect, useCallback } from 'react'
import { fetchSpaceWeather, SpaceWeatherResponse, KpEntry } from '../api'
import { useInterval } from '../hooks/useInterval'

function kpColor(kp: number): string {
  if (kp <= 3) return 'var(--green)'
  if (kp <= 5) return 'var(--yellow)'
  return 'var(--red)'
}

function kpLabel(kp: number): string {
  if (kp <= 2) return 'Quiet'
  if (kp <= 3) return 'Unsettled'
  if (kp <= 4) return 'Active'
  if (kp <= 5) return 'Minor Storm'
  if (kp <= 6) return 'Moderate Storm'
  if (kp <= 7) return 'Strong Storm'
  if (kp <= 8) return 'Severe Storm'
  return 'Extreme Storm'
}

function formatXray(flux: number): string {
  if (flux === 0) return 'A0.0'
  return flux.toExponential(2)
}

function KpBarChart({ history }: { history: KpEntry[] }) {
  const barWidth = 8
  const barGap = 2
  const chartHeight = 60
  const maxKp = 9

  // Show last 24 entries
  const entries = history.slice(-24)
  const totalWidth = entries.length * (barWidth + barGap) - barGap

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalWidth} ${chartHeight + 16}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      {/* Gridlines at kp 3, 5 */}
      {[3, 5].map((kp) => {
        const y = chartHeight - (kp / maxKp) * chartHeight
        return (
          <line
            key={kp}
            x1={0}
            y1={y}
            x2={totalWidth}
            y2={y}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        )
      })}

      {entries.map((entry, i) => {
        const barHeight = (entry.kp / maxKp) * chartHeight
        const x = i * (barWidth + barGap)
        const y = chartHeight - barHeight
        const color = kpColor(entry.kp)

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              opacity="0.7"
              rx="1"
            />
          </g>
        )
      })}

      {/* Bottom label */}
      <text
        x={0}
        y={chartHeight + 14}
        fill="var(--text-muted)"
        fontSize="7"
      >
        24h ago
      </text>
      <text
        x={totalWidth}
        y={chartHeight + 14}
        fill="var(--text-muted)"
        fontSize="7"
        textAnchor="end"
      >
        now
      </text>
    </svg>
  )
}

export default function SpaceWeather() {
  const [data, setData] = useState<SpaceWeatherResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchSpaceWeather(controller.signal)
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

  useInterval(load, 5 * 60 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>☀️</span>
        <span className="card-title">Space Weather</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="skeleton-block" style={{ height: '80px' }} />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-text" style={{ width: i % 2 === 0 ? '70%' : '50%' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">Space weather unavailable — {error}</p>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Kp Index hero */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'var(--surface2)',
              borderRadius: '10px',
              padding: '1rem',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '3rem',
                fontWeight: 700,
                color: kpColor(data.kp_index),
                lineHeight: 1,
                minWidth: '2.5rem',
                textAlign: 'center',
              }}
            >
              {data.kp_index.toFixed(1)}
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Kp Index
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: kpColor(data.kp_index), marginTop: '0.15rem' }}>
                {data.kp_label || kpLabel(data.kp_index)}
              </div>
            </div>
          </div>

          {/* Solar wind + X-ray */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <StatBlock label="Wind Speed" value={`${data.solar_wind_speed.toFixed(0)} km/s`} />
            <StatBlock label="Density" value={`${data.solar_wind_density.toFixed(1)} /cm³`} />
            <StatBlock
              label="X-Ray"
              value={data.xray_class || formatXray(data.xray_flux)}
              highlight={
                data.xray_class?.startsWith('X')
                  ? 'var(--red)'
                  : data.xray_class?.startsWith('M')
                  ? 'var(--yellow)'
                  : undefined
              }
            />
          </div>

          {/* Kp history bar chart */}
          {data.kp_history && data.kp_history.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                Kp — 24h History
              </div>
              <KpBarChart history={data.kp_history} />
            </div>
          )}

          {data.timestamp && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Updated {new Date(data.timestamp).toLocaleTimeString('en-US', { hour12: false })} UTC
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div
      style={{
        background: 'var(--surface2)',
        borderRadius: '8px',
        padding: '0.6rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: highlight || 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}
