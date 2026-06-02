import { useState, useEffect, Component, ReactNode } from 'react'
import APOD from './components/APOD'
import APODWeekStrip from './components/APODWeekStrip'
import ISSTracker from './components/ISSTracker'
import MoonPhase from './components/MoonPhase'
import Launches from './components/Launches'
import NEOTracker from './components/NEOTracker'
import SpaceWeather from './components/SpaceWeather'
import Planets from './components/Planets'
import Events from './components/Events'
import SolarSystem from './components/SolarSystem'
import MilkyWay from './components/MilkyWay'
import LiveFeeds from './components/LiveFeeds'
import Tonight from './components/Tonight'
import SatellitePasses from './components/SatellitePasses'
import VisiblePlanets from './components/VisiblePlanets'
import AuroraOutlook from './components/AuroraOutlook'
import Comets from './components/Comets'
import SDOSun from './components/SDOSun'
import MarsRover from './components/MarsRover'
import FeaturedTarget from './components/FeaturedTarget'
import MissionsTicker from './components/MissionsTicker'
import EarthFromSpace from './components/EarthFromSpace'

class ErrorBoundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="card">
          <div className="card-header">
            <span style={{ color: 'var(--red)' }}>⚠</span>
            <span className="card-title" style={{ color: 'var(--red)' }}>{this.props.name}</span>
          </div>
          <p className="error-message" style={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>
            {(this.state.error as Error).message}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

function useUTCClock(): string {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`
  })
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      const h = String(now.getUTCHours()).padStart(2, '0')
      const m = String(now.getUTCMinutes()).padStart(2, '0')
      const s = String(now.getUTCSeconds()).padStart(2, '0')
      setTime(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function App() {
  const utcTime = useUTCClock()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: 'clamp(0.5rem, 2vw, 1rem) clamp(0.75rem, 3vw, 1.5rem)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flex: 1 }}>
          <h1
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Astronomy Dashboard
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Real-time space data
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UTC</span>
          <span className="mono" style={{ fontSize: '0.95rem', color: 'var(--accent3)', fontWeight: 600, letterSpacing: '0.05em' }}>
            {utcTime}
          </span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          width: '100%',
          alignItems: 'start',
        }}
      >
        <style>{`
          @media (max-width: 1100px) { main { grid-template-columns: repeat(2, 1fr) !important; } }
          @media (max-width: 700px)  { main { grid-template-columns: 1fr !important; padding: 0.6rem !important; gap: 0.6rem !important; } }
          .span-full { grid-column: 1 / -1; }
          .span-2 { grid-column: span 2; }
          .span-3 { grid-column: span 3; }
          @media (max-width: 700px) { .span-2, .span-3 { grid-column: 1 / -1; } }
          @media (max-width: 700px) { .card { padding: 0.75rem !important; } }
          @media (max-width: 700px) { .card-header { margin-bottom: 0.6rem !important; } }
          @media (max-width: 700px) { .neo-table-row, .neo-table-header { grid-template-columns: 1fr auto auto !important; } }
          @media (max-width: 700px) { .neo-col-miss, .neo-col-vel, .neo-col-haz { display: none !important; } }
          @media (max-width: 700px) { .iss-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 420px) { .iss-grid { grid-template-columns: 1fr !important; } }
          @media (max-width: 700px) { .live-feeds-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important; } }
          @media (max-width: 700px) { .solar-layout { flex-direction: column !important; } }
          @media (max-width: 700px) { .solar-svg-wrap { flex: none !important; width: 100% !important; } }
          @media (max-width: 700px) { .solar-sidebar { flex: none !important; width: 100% !important; } }
          @media (max-width: 700px) { .solar-body-list { display: grid !important; grid-template-columns: 1fr 1fr !important; } }
        `}</style>

        {/* Row 0: Tonight at your location — THE headline card */}
        <div className="span-full">
          <ErrorBoundary name="Tonight at Your Location"><Tonight /></ErrorBoundary>
        </div>

        {/* Row 1: APOD (with weekly strip below the APOD body) */}
        <div className="span-full">
          <ErrorBoundary name="Astronomy Picture of the Day">
            <APOD />
            <APODWeekStrip />
          </ErrorBoundary>
        </div>

        {/* Row 2: Visible Planets, Featured Target, Comets, Satellite Passes */}
        <ErrorBoundary name="Visible Planets"><VisiblePlanets /></ErrorBoundary>
        <ErrorBoundary name="Featured Target"><FeaturedTarget /></ErrorBoundary>
        <ErrorBoundary name="Comets"><Comets /></ErrorBoundary>
        <ErrorBoundary name="Satellite Passes"><SatellitePasses /></ErrorBoundary>

        {/* Row 3: ISS, Moon, Space Weather, Aurora */}
        <ErrorBoundary name="ISS Tracker"><ISSTracker /></ErrorBoundary>
        <ErrorBoundary name="Moon Phase"><MoonPhase /></ErrorBoundary>
        <ErrorBoundary name="Space Weather"><SpaceWeather /></ErrorBoundary>
        <ErrorBoundary name="Aurora Outlook"><AuroraOutlook /></ErrorBoundary>

        {/* Row 4: Sun image (span 2) + EPIC Earth (span 2) */}
        <div className="span-2"><ErrorBoundary name="Live Sun"><SDOSun /></ErrorBoundary></div>
        <div className="span-2"><ErrorBoundary name="Earth from Space"><EarthFromSpace /></ErrorBoundary></div>

        {/* Row 5: Mars rover (span 2), Missions ticker (span 2) */}
        <div className="span-2"><ErrorBoundary name="From Mars"><MarsRover /></ErrorBoundary></div>
        <div className="span-2"><ErrorBoundary name="Right Now in Space"><MissionsTicker /></ErrorBoundary></div>

        {/* Row 6: Galaxy Visibility (existing Planets, full-detail table) */}
        <div className="span-full"><ErrorBoundary name="Galaxy Visibility"><Planets /></ErrorBoundary></div>

        {/* Row 7: Solar System map */}
        <div className="span-full"><ErrorBoundary name="Solar System"><SolarSystem /></ErrorBoundary></div>

        {/* Row 8: Milky Way map with overhead annotation */}
        <div className="span-full"><ErrorBoundary name="Milky Way"><MilkyWay /></ErrorBoundary></div>

        {/* Row 9: Launches + NEO */}
        <div className="span-2"><ErrorBoundary name="Upcoming Launches"><Launches /></ErrorBoundary></div>
        <div className="span-2"><ErrorBoundary name="Near-Earth Objects"><NEOTracker /></ErrorBoundary></div>

        {/* Row 10: Live Feeds */}
        <div className="span-full"><ErrorBoundary name="Live Feeds"><LiveFeeds /></ErrorBoundary></div>

        {/* Row 11: Upcoming Events */}
        <div className="span-full"><ErrorBoundary name="Upcoming Events"><Events /></ErrorBoundary></div>
      </main>

      <footer
        style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>Data: NASA · The Space Devs · NOAA SWPC · WhereTheISS.at · Open-Meteo · Celestrak · NASA SDO · DSCOVR EPIC</span>
      </footer>
    </div>
  )
}
