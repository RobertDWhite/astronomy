import { useState, useEffect } from 'react'
import { fetchLiveFeeds, LiveFeed } from '../api'

interface FeedMeta {
  id: string
  name: string
  icon: string
  tag: string
  tagColor: string
}

const FEED_META: FeedMeta[] = [
  { id: 'nasa-tv',  name: 'NASA TV',       icon: '📡', tag: '24/7',   tagColor: 'var(--accent3)' },
  { id: 'iss-hdev', name: 'ISS Earth View', icon: '🌍', tag: 'LIVE',   tagColor: 'var(--accent3)' },
  { id: 'iss-afar',     name: 'ISS Earth (afar)', icon: '🛰', tag: '24/7',   tagColor: 'var(--accent3)' },
  { id: 'nsf-starbase', name: 'Starbase 24/7',    icon: '🚀', tag: '24/7',   tagColor: 'var(--accent3)' },
  { id: 'avid-space',   name: 'Astro Camera',     icon: '🔭', tag: '24/7',   tagColor: 'var(--accent3)' },
  { id: 'spacex',   name: 'SpaceX',         icon: '🚀', tag: 'EVENTS', tagColor: 'var(--accent)' },
  { id: 'nasa-jpl', name: 'NASA JPL',       icon: '🔭', tag: 'EVENTS', tagColor: 'var(--accent)' },
  { id: 'esa',      name: 'ESA',            icon: '🛸', tag: 'EVENTS', tagColor: 'var(--accent)' },
]

function embedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`
}

function FeedTile({
  meta,
  feed,
  expanded,
  onExpand,
}: {
  meta: FeedMeta
  feed: LiveFeed | null
  expanded: boolean
  onExpand: () => void
}) {
  const hasVideo = feed?.video_id != null
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        background: '#080b12',
        borderRadius: '4px',
        overflow: 'hidden',
        cursor: hasVideo ? 'zoom-in' : 'default',
        outline: expanded ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)',
        outlineOffset: '-1px',
        transition: 'outline-color 0.15s',
      }}
      onClick={hasVideo ? onExpand : undefined}
    >
      {hasVideo ? (
        <iframe
          src={embedUrl(feed!.video_id!)}
          title={meta.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem',
          background: 'linear-gradient(135deg, #0a0e18 0%, #0d1220 100%)',
        }}>
          <span style={{ fontSize: '2rem', opacity: 0.4 }}>{meta.icon}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.04em' }}>Awaiting Live Event</span>
        </div>
      )}

      {/* Label bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0.3rem 0.5rem',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          {meta.icon} {meta.name}
        </span>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700,
          color: meta.tagColor,
          letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: '0.25rem',
        }}>
          {(meta.tag === '24/7' || (meta.tag === 'LIVE' && feed?.is_live)) && (
            <span style={{
              display: 'inline-block', width: 5, height: 5,
              borderRadius: '50%', background: meta.tagColor,
              animation: 'blink 2s infinite',
            }} />
          )}
          {feed?.is_live ? meta.tag : (feed?.video_id ? 'RECENT' : meta.tag)}
        </span>
      </div>

      {expanded && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          fontSize: '0.6rem', color: 'var(--accent)',
          background: 'rgba(96,165,250,0.2)',
          padding: '0.1rem 0.3rem', borderRadius: '3px',
          pointerEvents: 'none',
        }}>
          FOCUSED
        </div>
      )}
    </div>
  )
}

export default function LiveFeeds() {
  const [feeds, setFeeds] = useState<LiveFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchLiveFeeds(controller.signal)
      .then(data => { setFeeds(data); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => controller.abort()
  }, [])

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id)
  const expandedMeta = FEED_META.find(m => m.id === expandedId)
  const expandedFeed = feeds.find(f => f.id === expandedId)

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span style={{ fontSize: '1rem' }}>📺</span>
        <span className="card-title">Live Space Feeds</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Click to focus · Muted by default
        </span>
      </div>

      {/* Expanded view */}
      {expandedMeta && expandedFeed?.video_id && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', paddingBottom: '45%', height: 0, borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
            <iframe
              key={`expanded-${expandedFeed.id}`}
              src={embedUrl(expandedFeed.video_id)}
              title={expandedMeta.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{expandedMeta.icon} {expandedMeta.name} — click tile below to switch</span>
            <button
              onClick={() => setExpandedId(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
            >
              x close
            </button>
          </div>
        </div>
      )}

      {/* Tile grid */}
      <div className="live-feeds-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '3px',
        background: '#03050a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '6px',
        padding: '3px',
      }}>
        {loading ? (
          FEED_META.map(m => (
            <div key={m.id} style={{ aspectRatio: '16/9', background: '#0a0e18', borderRadius: '3px' }}
              className="skeleton-block" />
          ))
        ) : (
          FEED_META.map(meta => (
            <FeedTile
              key={meta.id}
              meta={meta}
              feed={feeds.find(f => f.id === meta.id) ?? null}
              expanded={expandedId === meta.id}
              onExpand={() => toggleExpand(meta.id)}
            />
          ))
        )}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0 }}>
        Shows most recent broadcast when not live. Click any tile to focus.
      </p>
    </div>
  )
}
