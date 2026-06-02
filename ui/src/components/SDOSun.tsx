import { useState, useEffect } from 'react'

const SDO_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIC.jpg'
const SDO_AIA_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg'

export default function SDOSun() {
  const [tick, setTick] = useState(0)
  // Force fresh image fetch every 15 min
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ color: 'var(--accent2)', fontSize: '1rem' }}>☀</span>
        <span className="card-title">The Sun, Live</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>NASA SDO · updates every 15 min</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div>
          <img
            src={`${SDO_URL}?t=${tick}`}
            alt="SDO HMI intensitygram (visible light)"
            loading="lazy"
            style={{ width: '100%', borderRadius: 6, display: 'block', aspectRatio: '1', objectFit: 'cover', background: '#000' }}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Visible light · sunspots</div>
        </div>
        <div>
          <img
            src={`${SDO_AIA_URL}?t=${tick}`}
            alt="SDO AIA 193 Å (extreme UV)"
            loading="lazy"
            style={{ width: '100%', borderRadius: 6, display: 'block', aspectRatio: '1', objectFit: 'cover', background: '#000' }}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Extreme UV · corona</div>
        </div>
      </div>
    </div>
  )
}
