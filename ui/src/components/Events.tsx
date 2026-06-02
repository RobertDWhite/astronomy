import { useState, useEffect, useCallback } from 'react'
import { fetchEvents, AstroEvent } from '../api'
import { useInterval } from '../hooks/useInterval'

const TYPE_ICONS: Record<string, string> = {
  moon: '🌙', moon_phase: '🌙',
  meteor: '☄️', meteor_shower: '☄️',
  equinox: '🌍', solstice: '☀️',
  planet: '🪐', opposition: '🪐', conjunction: '🌟',
  eclipse: '🌑', comet: '🌠', other: '✦',
}

// Color accent per event category
const TYPE_COLOR: Record<string, string | null> = {
  meteor_shower: '#f97316',   // orange — showers
  meteor:        '#f97316',
  opposition:    '#06b6d4',   // cyan — planet passes / oppositions
  conjunction:   '#06b6d4',
  planet:        '#06b6d4',
  comet:         '#06b6d4',
  equinox:       '#34d399',   // green — seasonal changes
  solstice:      '#34d399',
  eclipse:       '#a855f7',   // purple — eclipses
  moon_phase:    null,        // no highlight
  moon:          null,
  other:         null,
}

function typeColor(type: string): string | null {
  return TYPE_COLOR[type] ?? null
}

const EVENT_DETAIL: Record<string, string[]> = {
  'Quadrantids Meteor Shower':       ['Parent body: Asteroid 2003 EH1', 'Radiant: Boötes / Draco border', 'Best viewing: 2–6 AM local time, facing NE', 'Short but intense peak (~6 hrs); minimize moonlight exposure'],
  'Lyrids Meteor Shower':            ['Parent body: Comet C/1861 G1 Thatcher', 'Radiant: Lyra (near Vega)', 'Best viewing: 2–5 AM local time', 'Occasional bright fireballs with trains'],
  'Eta Aquariids Meteor Shower':     ['Parent body: Comet 1P/Halley', 'Radiant: Aquarius', 'Best viewing: 3–5 AM, favors southern hemisphere', 'Fast meteors (~66 km/s) with persistent trains'],
  'Delta Aquariids Meteor Shower':   ['Parent body: Comet 96P/Machholz', 'Radiant: Aquarius (southern)', 'Best viewing: 2–4 AM, excellent from tropics & southern hemisphere', 'Broad peak; pairs well with Perseids in late July'],
  'Alpha Capricornids Meteor Shower':['Parent body: Comet 169P/NEAT', 'Radiant: Capricornus', 'Best viewing: After midnight, visible globally', 'Slow, bright fireballs; low ZHR but striking'],
  'Perseids Meteor Shower':          ['Parent body: Comet 109P/Swift-Tuttle', 'Radiant: Perseus', 'Best viewing: 11 PM – dawn; most active 1–4 AM', 'Most popular shower; warm nights, high rates, bright fireballs'],
  'Draconids Meteor Shower':         ['Parent body: Comet 21P/Giacobini-Zinner', 'Radiant: Draco (circumpolar — active at dusk!)', 'Best viewing: Evening hours, not after midnight', 'Highly variable — can storm in outburst years'],
  'Orionids Meteor Shower':          ['Parent body: Comet 1P/Halley', 'Radiant: Orion', 'Best viewing: 2–5 AM, both hemispheres', 'Fast meteors; can produce fireballs'],
  'Leonids Meteor Shower':           ['Parent body: Comet 55P/Tempel-Tuttle', 'Radiant: Leo', 'Best viewing: 2–5 AM; peaks before dawn', 'Historical storm potential (~1833, 1966, 1999); typically ~15 ZHR'],
  'Geminids Meteor Shower':          ['Parent body: Asteroid 3200 Phaethon (unusual!)', 'Radiant: Gemini', 'Best viewing: 10 PM – 3 AM; active early evening too', 'Best annual shower; multicolored, slow, reliable'],
  'Ursids Meteor Shower':            ['Parent body: Comet 8P/Tuttle', 'Radiant: Ursa Minor (near Polaris)', 'Best viewing: After midnight for northern observers', 'Quiet shower; occasionally outbursts to 25+ ZHR'],
  'Vernal Equinox':                  ['Sun crosses celestial equator northward', 'Day and night approximately equal (~12 hrs each)', 'Northern hemisphere spring begins; southern hemisphere autumn', 'Sun rises due east and sets due west'],
  'Autumnal Equinox':                ['Sun crosses celestial equator southward', 'Day and night approximately equal (~12 hrs each)', 'Northern hemisphere autumn begins; southern hemisphere spring', 'Sun rises due east and sets due west'],
  'Summer Solstice':                 ['Sun reaches its northernmost declination (+23.5°)', 'Longest day of the year in the northern hemisphere', 'Sun rises and sets at its furthest north points', 'Midnight sun north of the Arctic Circle'],
  'Winter Solstice':                 ['Sun reaches its southernmost declination (−23.5°)', 'Shortest day of the year in the northern hemisphere', 'Sun rises and sets at its furthest south points', 'Midnight sun south of the Antarctic Circle'],
}

function eventDetail(event: AstroEvent): string[] {
  if (EVENT_DETAIL[event.name]) return EVENT_DETAIL[event.name]
  if (event.type === 'opposition') return [
    'Planet is opposite the Sun in the sky',
    'Rises at sunset, visible all night',
    'Closest approach to Earth — largest apparent disk',
    'Best time of year to observe this planet',
  ]
  if (event.type === 'conjunction') return [
    'Planet passes near the Sun as seen from Earth',
    'Not visible — lost in solar glare',
    'Good time to plan for upcoming evening/morning apparition',
  ]
  if (event.type === 'eclipse') return [
    'Check NASA eclipse maps for your specific location',
    'Solar eclipses: use certified solar filter glasses',
    'Lunar eclipses: safe to view with naked eye or binoculars',
  ]
  if (event.type === 'moon_phase' || event.type === 'moon') {
    if (event.name.includes('New')) return ['Moon not visible — darkest skies for deep-sky observing', 'Best nights for nebulae, galaxies, and Milky Way photography']
    if (event.name.includes('Full')) return ['Moon fully illuminated — bright skies wash out faint objects', 'Good for casual lunar observation and landscape photography']
    if (event.name.includes('First Quarter')) return ['Moon rises around noon, sets around midnight', 'Eastern half illuminated; good for observing the terminator']
    if (event.name.includes('Last Quarter')) return ['Moon rises around midnight, sets around noon', 'Western half illuminated; best viewed in the early morning']
  }
  return []
}

function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - now.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getMonthGroup(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function DaysUntilBadge({ days }: { days: number }) {
  if (days === 0) {
    return <span className="badge badge-green">Today</span>
  }
  if (days < 0) {
    return <span className="badge" style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Past</span>
  }
  if (days <= 7) {
    return <span className="badge badge-blue">In {days}d</span>
  }
  return (
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      {days}d away
    </span>
  )
}

export default function Events() {
  const [data, setData] = useState<AstroEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchEvents(controller.signal)
      .then((d) => {
        const sorted = [...d.events].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        setData(sorted)
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

  // Group events by month
  const grouped: Record<string, AstroEvent[]> = {}
  for (const event of data) {
    const key = getMonthGroup(event.date)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(event)
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>📅</span>
        <span className="card-title">Upcoming Astronomical Events</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { color: '#f97316', label: 'Showers' },
            { color: '#06b6d4', label: 'Oppositions' },
            { color: '#34d399', label: 'Seasonal' },
            { color: '#a855f7', label: 'Eclipses' },
            { color: 'rgba(255,255,255,0.2)', label: 'Moon' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {label}
            </span>
          ))}
          {!loading && !error && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '0.25rem', borderLeft: '1px solid var(--border)' }}>
              {data.length} events
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-text" style={{ height: '2.5rem', width: '100%' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">Events data unavailable — {error}</p>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="error-message">No upcoming events found.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(grouped).map(([month, events]) => (
            <div key={month}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--accent2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.6rem',
                  paddingBottom: '0.4rem',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {month}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '0.6rem',
                }}
              >
                {events.map((event) => {
                  const days = daysUntil(event.date)
                  const isPast = days < 0
                  const icon = TYPE_ICONS[event.type] || TYPE_ICONS.other
                  const detail = eventDetail(event)
                  const isSelected = selectedId === event.id
                  const accent = typeColor(event.type)

                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedId(isSelected ? null : event.id)}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        background: isSelected
                          ? (accent ? `${accent}12` : 'var(--surface)')
                          : 'var(--surface2)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        opacity: isPast ? 0.5 : 1,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${isSelected
                          ? (accent ?? 'var(--accent)')
                          : (accent ? `${accent}70` : (days === 0 ? 'var(--accent3)' : 'var(--border)'))}`,
                      }}
                    >
                      <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                            {event.name}
                          </span>
                          <DaysUntilBadge days={days} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          {formatDate(event.date)}
                        </div>
                        {event.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {event.description}
                          </div>
                        )}
                        {event.type === 'eclipse' && event.local_note && (
                          <div style={{ fontSize: '0.75rem', color: event.visible_from_observer ? 'var(--accent3)' : 'var(--text-muted)', marginTop: '0.3rem', padding: '0.25rem 0.4rem', borderLeft: `2px solid ${event.visible_from_observer ? 'var(--accent3)' : 'var(--text-muted)'}`, background: event.visible_from_observer ? 'rgba(34,197,94,0.05)' : 'transparent' }}>
                            <strong>From your location:</strong> {event.local_note}
                          </div>
                        )}
                        {isSelected && detail.length > 0 && (
                          <ul style={{
                            margin: '0.5rem 0 0',
                            padding: 0,
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}>
                            {detail.map((line, i) => (
                              <li key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>·</span>
                                {line}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
