import { useState, useEffect, useCallback } from 'react'
import { fetchISS, ISSResponse } from '../api'
import { useInterval } from '../hooks/useInterval'

function formatCoord(val: number, posLabel: string, negLabel: string): string {
  const abs = Math.abs(val).toFixed(4)
  return `${abs}° ${val >= 0 ? posLabel : negLabel}`
}

const CREW_FLAGS: Record<string, string> = {
  // NASA
  'Butch Wilmore': '🇺🇸', 'Sunita Williams': '🇺🇸', 'Nick Hague': '🇺🇸',
  'Don Pettit': '🇺🇸', 'Tracy Caldwell Dyson': '🇺🇸', 'Matthew Dominick': '🇺🇸',
  'Michael Barratt': '🇺🇸', 'Jeanette Epps': '🇺🇸', 'Jonny Kim': '🇺🇸',
  'Zena Cardman': '🇺🇸', 'Stephanie Wilson': '🇺🇸', 'Anne McClain': '🇺🇸',
  'Frank Rubio': '🇺🇸', 'Mark Vande Hei': '🇺🇸', 'Kjell Lindgren': '🇺🇸',
  'Bob Hines': '🇺🇸', 'Josh Cassada': '🇺🇸', 'Mike Lopez-Alegria': '🇺🇸',
  'Chris Williams': '🇺🇸', 'Victor Glover': '🇺🇸', 'Shannon Walker': '🇺🇸',
  'Kate Rubins': '🇺🇸', 'Kayla Barron': '🇺🇸', 'Raja Chari': '🇺🇸',
  'Tom Marshburn': '🇺🇸', 'Stephen Bowen': '🇺🇸', 'Woody Hoburg': '🇺🇸',
  'Steve Swanson': '🇺🇸', 'Reid Wiseman': '🇺🇸',
  // Roscosmos
  'Oleg Kononenko': '🇷🇺', 'Nikolai Chub': '🇷🇺', 'Alexander Grebenkin': '🇷🇺',
  'Sergey Prokopyev': '🇷🇺', 'Dmitry Petelin': '🇷🇺', 'Andrey Fedyaev': '🇷🇺',
  'Oleg Artemyev': '🇷🇺', 'Denis Matveev': '🇷🇺', 'Sergey Korsakov': '🇷🇺',
  'Ivan Vagner': '🇷🇺', 'Pyotr Dubrov': '🇷🇺', 'Anton Shkaplerov': '🇷🇺',
  'Anatoly Ivanishin': '🇷🇺', 'Aleksandr Misurkin': '🇷🇺',
  // ESA
  'Samantha Cristoforetti': '🇮🇹', 'Matthias Maurer': '🇩🇪',
  'Thomas Pesquet': '🇫🇷', 'Andreas Mogensen': '🇩🇰',
  'Tim Peake': '🇬🇧', 'Tim Kopra': '🇺🇸',
  // JAXA
  'Koichi Wakata': '🇯🇵', 'Satoshi Furukawa': '🇯🇵', 'Akihiko Hoshide': '🇯🇵',
  'Kimiya Yui': '🇯🇵', 'Takuya Onishi': '🇯🇵',
  // CSA
  'Jeremy Hansen': '🇨🇦', 'David Saint-Jacques': '🇨🇦', 'Chris Hadfield': '🇨🇦',
  // CMSA / Tiangong
  'Ye Guangfu': '🇨🇳', 'Zhai Zhigang': '🇨🇳', 'Wang Yaping': '🇨🇳',
  'Chen Dong': '🇨🇳', 'Liu Yang': '🇨🇳', 'Cai Xuzhe': '🇨🇳',
  'Jing Haipeng': '🇨🇳', 'Deng Qingming': '🇨🇳', 'Zhang Lu': '🇨🇳',
  'Fei Junlong': '🇨🇳', 'Li Guangsu': '🇨🇳', 'Li Cong': '🇨🇳',
  'Tang Shengjie': '🇨🇳', 'Jiang Xinlin': '🇨🇳', 'Gui Haichao': '🇨🇳',
  'Zhu Yangzhu': '🇨🇳', 'Chen Guangfu': '🇨🇳',
}

// Only verified handles — X usernames that are confirmed official astronaut accounts
const CREW_X: Record<string, string> = {
  'Don Pettit': 'astro_Pettit',
  'Nick Hague': 'AstroHague',
  'Sunita Williams': 'Astro_Suni',
  'Jonny Kim': 'astro_jonnykim',
  'Victor Glover': 'AstroVicGlover',
  'Reid Wiseman': 'astro_reid',
  'Frank Rubio': 'AstroFrankRubio',
  'Woody Hoburg': 'WoodyInSpace',
  'Kayla Barron': 'AstroBarron',
  'Matthew Dominick': 'dominick_astro',
  'Thomas Pesquet': 'Thom_astro',
  'Andreas Mogensen': 'Astro_Andreas',
  'Samantha Cristoforetti': 'AstroSamantha',
  'Chris Hadfield': 'Cmdr_Hadfield',
}

function crewFlag(name: string, craft: string): string {
  if (craft === 'Tiangong') return '🇨🇳'
  return CREW_FLAGS[name] || '🌍'
}


export default function ISSTracker() {
  const [data, setData] = useState<ISSResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(() => {
    const controller = new AbortController()
    fetchISS(controller.signal)
      .then((d) => {
        setData(d)
        setError(null)
        setLoading(false)
        setLastUpdated(new Date())
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

  useInterval(load, 10 * 1000)

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>🛰</span>
        <span className="card-title">ISS Tracker</span>
        {data && (
          <span
            className="blink"
            style={{
              marginLeft: 'auto',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent3)',
              display: 'inline-block',
            }}
          />
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-text" style={{ width: i % 2 === 0 ? '70%' : '50%' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="error-message">ISS data unavailable — {error}</p>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            className="iss-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: '8px',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Latitude
              </div>
              <div className="mono" style={{ fontSize: '1rem', color: 'var(--accent)' }}>
                {formatCoord(data.position.latitude, 'N', 'S')}
              </div>
            </div>
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: '8px',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Longitude
              </div>
              <div className="mono" style={{ fontSize: '1rem', color: 'var(--accent)' }}>
                {formatCoord(data.position.longitude, 'E', 'W')}
              </div>
            </div>
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: '8px',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Altitude
              </div>
              <div className="mono" style={{ fontSize: '1rem', color: 'var(--accent2)' }}>
                {data.position.altitude.toFixed(1)} km
              </div>
            </div>
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: '8px',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Velocity
              </div>
              <div className="mono" style={{ fontSize: '1rem', color: 'var(--accent2)' }}>
                {data.position.velocity.toFixed(1)} km/s
              </div>
            </div>
          </div>

          <hr className="divider" />

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Current Crew ({data.crew.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {data.crew.map((member) => {
                const xHandle = CREW_X[member.name]
                return (
                  <div
                    key={member.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text)' }}>
                      <span>{crewFlag(member.name, member.craft)}</span>
                      <span>{member.name}</span>
                      {xHandle && (
                        <a
                          href={`https://x.com/${xHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textDecoration: 'none', lineHeight: 1 }}
                          title={`@${xHandle} on X`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          𝕏
                        </a>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--accent)',
                        background: 'rgba(96, 165, 250, 0.1)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {member.craft}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
            {lastUpdated && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour12: false, timeZoneName: 'short' })}
              </span>
            )}
            <a
              href="https://x.com/Space_Station"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              𝕏 @Space_Station
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
