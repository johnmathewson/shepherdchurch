'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'

const TZ = 'America/Chicago'
const WORD_CAP = 500

function formatDate(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(d))
}

function truncateWords(text, max) {
  if (!text) return { display: '', truncated: false }
  const words = text.trim().split(/\s+/)
  if (words.length <= max) return { display: text, truncated: false }
  return { display: words.slice(0, max).join(' ') + '…', truncated: true }
}

const categories = [
  { value: 'all', label: 'All' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'physical', label: 'Physical' },
  { value: 'other', label: 'Other' },
]

// Deterministic small tilt per card so layout is stable across renders
function tiltFor(id) {
  let h = 0
  for (let i = 0; i < (id?.length || 0); i++) h = (h * 31 + id.charCodeAt(i)) | 0
  // -2.0 to +2.0 degrees
  return (((h % 41) - 20) / 10).toFixed(2)
}

export default function AnsweredPrayersPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const fetchAnswered = useCallback(async () => {
    setLoading(true)
    try {
      const url = filter === 'all' ? '/api/answered' : `/api/answered?category=${filter}`
      const res = await fetch(url)
      const data = await res.json()
      setItems(data.answered || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchAnswered() }, [fetchAnswered])

  return (
    <div className="wall-bg min-h-screen relative">
      {/* Brick wall background image */}
      <div className="wall-image" />
      {/* Atmospheric overlays */}
      <div className="wall-tint" />
      <div className="wall-light" />
      <div className="wall-vignette" />

      {/* Back button — always visible */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass text-text-secondary hover:text-text-primary text-sm font-medium transition-all hover:border-gold/40"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-12 animate-fade-in">
          <p className="text-gold uppercase tracking-[0.3em] text-[10px] sm:text-xs font-semibold mb-3 sm:mb-4">The Wall of Answered Prayer</p>
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-5 text-white drop-shadow-lg">
            What God Has Done
          </h1>
          <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            Each card is a testimony — a real prayer that was lifted, held in faith, and answered.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex justify-center gap-2 mb-12 overflow-x-auto pb-2">
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === c.value
                  ? 'bg-gold text-white shadow-lg shadow-gold/30'
                  : 'glass text-text-secondary hover:border-gold/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <div className="text-center py-20 glass rounded-lg max-w-md mx-auto">
            <p className="text-text-muted">
              No testimonies on this part of the wall yet. As God moves, new cards will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-9">
            {items.map((item, idx) => {
              const { display, truncated } = truncateWords(item.outcome_note, WORD_CAP)
              const isExpanded = expandedId === item.id
              const tilt = tiltFor(item.id)
              return (
                <article
                  key={item.id}
                  onClick={() => truncated && setExpandedId(isExpanded ? null : item.id)}
                  className={`wall-card glass-strong rounded-lg p-5 sm:p-7 animate-fade-in transition-all cursor-pointer ${
                    isExpanded ? 'md:col-span-2' : ''
                  } ${truncated ? 'hover:scale-[1.02]' : ''}`}
                  style={{
                    transform: isExpanded ? 'rotate(0deg)' : `rotate(${tilt}deg)`,
                    animationDelay: `${idx * 60}ms`,
                  }}
                >
                  {/* Pin */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,168,67,0.7)]" />

                  <div className="flex items-start justify-between gap-3 mb-3 mt-1">
                    <Badge type="category" value={item.category} />
                    <span className="text-text-muted text-xs">
                      Answered {formatDate(item.outcome_at)}
                    </span>
                  </div>

                  <h2 className="font-heading text-xl font-semibold mb-2 text-white">{item.title}</h2>

                  <p className="text-text-muted text-xs italic mb-4 line-clamp-2">
                    Original request: {item.description}
                  </p>

                  <div className="bg-gold/8 border-l-2 border-gold/60 pl-4 py-3 pr-3 rounded-r-md">
                    <div className="flex items-center gap-2 mb-2 text-gold text-[10px] uppercase tracking-[0.2em] font-bold">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Testimony
                    </div>
                    <p className="text-text-primary leading-relaxed whitespace-pre-wrap text-sm">
                      {isExpanded ? item.outcome_note : display}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8">
                    <div className="flex items-center gap-1.5 text-text-muted text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {item.pickup_count} prayed for this
                    </div>
                    {truncated && (
                      <span className="text-gold text-xs font-medium">
                        {isExpanded ? 'Tap to collapse' : 'Tap to read more'}
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
