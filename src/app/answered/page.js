'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'

const TZ = 'America/Chicago'

function formatDate(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(d))
}

const categories = [
  { value: 'all', label: 'All' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'physical', label: 'Physical' },
  { value: 'other', label: 'Other' },
]

const NOTE_COLORS = ['yellow', 'pink', 'blue', 'mint', 'orange', 'peach', 'lavender']

// Deterministic hash so a given prayer always lands on the same color and
// tilt — keeps the wall stable across renders, filters, and revisits.
function hashId(id) {
  let h = 0
  for (let i = 0; i < (id?.length || 0); i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}
function colorFor(id) {
  return NOTE_COLORS[hashId(id) % NOTE_COLORS.length]
}
function tiltFor(id) {
  // -4° to +4° feels lively without making text painful to read
  const h = hashId(id + '|tilt')
  return ((h % 81) - 40) / 10
}

export default function AnsweredPrayersPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

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

  // Modal: Esc to close + body scroll lock while open
  useEffect(() => {
    if (!selected) return
    function onKey(e) { if (e.key === 'Escape') setSelected(null) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [selected])

  return (
    <div className="board-room min-h-screen relative">
      {/* Back button */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-text-secondary hover:text-white hover:border-gold/40 text-sm font-medium transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-20">
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <p className="text-gold uppercase tracking-[0.3em] text-[10px] sm:text-xs font-semibold mb-3 sm:mb-4">Answered Prayers</p>
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-5 text-white drop-shadow-lg">
            What God Has Done
          </h1>
          <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            Tap a note to read the testimony — every one a real prayer that was lifted and answered.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex justify-center gap-2 mb-8 sm:mb-10 overflow-x-auto pb-2">
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === c.value
                  ? 'bg-gold text-white shadow-lg shadow-gold/30'
                  : 'bg-black/30 backdrop-blur-md border border-white/10 text-text-secondary hover:border-gold/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* The board */}
        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <div className="board-frame">
            <div className="board-surface flex items-center justify-center">
              <p className="text-text-muted text-center max-w-md py-16">
                No testimonies on the board yet. As God moves, new notes will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="board-frame animate-fade-in">
            <div className="board-surface">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8">
                {items.map((item, idx) => {
                  const color = colorFor(item.id)
                  const tilt = tiltFor(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelected(item)}
                      aria-label={`Read testimony: ${item.title}`}
                      className={`sticky-note note-${color} animate-fade-in`}
                      style={{
                        '--note-tilt': `${tilt}deg`,
                        animationDelay: `${Math.min(idx * 40, 600)}ms`,
                        aspectRatio: '1 / 1',
                      }}
                    >
                      <span className="block text-[1.35rem] sm:text-[1.5rem] leading-[1.15] font-semibold line-clamp-4 px-1">
                        {item.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal — full testimony on a larger version of the same note */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="testimony-title"
        >
          <div
            className={`note-modal note-${colorFor(selected.id)}`}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-4 mt-1" style={{ fontFamily: 'var(--font-body), sans-serif' }}>
              <Badge type="category" value={selected.category} />
              <span className="text-black/60 text-xs">
                Answered {formatDate(selected.outcome_at)}
              </span>
            </div>

            <h2 id="testimony-title" className="text-3xl sm:text-4xl font-bold leading-tight mb-4 pr-6">
              {selected.title}
            </h2>

            <p
              className="text-black/55 text-sm italic mb-5 leading-relaxed"
              style={{ fontFamily: 'var(--font-body), sans-serif' }}
            >
              Original prayer: {selected.description}
            </p>

            <div className="border-t border-black/15 pt-4">
              <div
                className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/55 mb-2 flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-body), sans-serif' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Testimony
              </div>
              <p
                className="text-black/85 text-base leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: 'var(--font-body), sans-serif' }}
              >
                {selected.outcome_note}
              </p>
            </div>

            <div
              className="flex items-center gap-1.5 mt-5 pt-4 border-t border-black/15 text-black/55 text-xs"
              style={{ fontFamily: 'var(--font-body), sans-serif' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {selected.pickup_count} prayed for this
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
