'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'

const TZ = 'America/Chicago'
const WORD_CAP = 500

function formatDate(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(d))
}

// Truncate testimony to N words for the card. Returns { display, truncated }.
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
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/submit" className="text-sage hover:text-sage-light text-sm font-medium">Submit Request</Link>
      </Nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-gold uppercase tracking-[0.3em] text-xs font-semibold mb-3">Answered Prayers</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
            What God Has Done
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Real testimonies from our community. Each story below is a prayer that was lifted up,
            held in faith, and answered. May they build your faith.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex justify-center gap-2 mb-10 overflow-x-auto pb-2">
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === c.value
                  ? 'bg-gold text-white'
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
          <div className="text-center py-20 glass rounded-lg">
            <p className="text-text-muted">
              No answered prayers shared yet in this category. As God moves, this wall will fill up.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map(item => {
              const { display, truncated } = truncateWords(item.outcome_note, WORD_CAP)
              const isExpanded = expandedId === item.id
              return (
                <article
                  key={item.id}
                  className="glass rounded-lg p-6 sm:p-8 border-l-4 border-gold/60 animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge type="category" value={item.category} />
                      <span className="text-text-muted text-xs">
                        Answered {formatDate(item.outcome_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted text-xs">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {item.pickup_count} prayed for this
                    </div>
                  </div>

                  <h2 className="font-heading text-xl font-semibold mb-2">{item.title}</h2>
                  <p className="text-text-muted text-sm mb-5 italic line-clamp-2">
                    Original request: {item.description}
                  </p>

                  <div className="bg-gold/5 border border-gold/20 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3 text-gold text-xs uppercase tracking-wider font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Testimony
                    </div>
                    <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
                      {isExpanded ? item.outcome_note : display}
                    </p>
                    {truncated && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="mt-3 text-gold hover:text-gold-light text-sm font-medium"
                      >
                        {isExpanded ? 'Show less' : 'Read full testimony'}
                      </button>
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
