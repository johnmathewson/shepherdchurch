'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import ErrorAlert from '@/components/ErrorAlert'

const TZ = 'America/Chicago'

function formatFullTime(d) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(d))
}
function formatRange(start, end) {
  const s = new Date(start), e = new Date(end)
  const startFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric' }).format(s)
  const endFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', timeZoneName: 'short' }).format(e)
  return `${startFmt} – ${endFmt}`
}

export default function MySlotsPage() {
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [event, setEvent] = useState(null)

  const fetchSignups = useCallback(async () => {
    try {
      const [res, eventRes] = await Promise.all([
        fetch('/api/prayer-week/my-slots'),
        fetch('/api/prayer-week/event'),
      ])
      if (res.status === 401) {
        setAuthError(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      setSignups(data.signups || [])
      if (eventRes.ok) {
        const eventData = await eventRes.json()
        setEvent(eventData.event)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSignups() }, [fetchSignups])

  async function handleRelease(signup_id) {
    if (!confirm('Release this hour? Someone else will be able to claim it.')) return
    try {
      const res = await fetch('/api/prayer-week/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signup_id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not release slot')
        return
      }
      fetchSignups()
    } catch (err) {
      setError('Network error')
    }
  }

  async function handleSaveNotes(signup_id) {
    try {
      const res = await fetch('/api/prayer-week/my-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signup_id, notes: editingNotes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not save')
        return
      }
      setEditingId(null)
      fetchSignups()
    } catch (err) {
      setError('Network error')
    }
  }

  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Sign in to see your slots</h1>
          <Link href="/login?next=/prayer-week/my-slots" className="px-8 py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all inline-block">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/prayer-week" className="text-text-secondary hover:text-text-primary text-sm">Calendar</Link>
      </Nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-gold uppercase tracking-[0.3em] text-xs font-semibold mb-2">{event?.name || 'Day/Night'}</p>
          <h1 className="font-heading text-3xl font-bold mb-2">My Prayer Hours</h1>
          <p className="text-text-secondary">
            {signups.length === 0
              ? "You haven't claimed any hours yet."
              : `You're praying for ${signups.length} hour${signups.length !== 1 ? 's' : ''} during this week.`}
          </p>
        </div>

        <ErrorAlert message={error} />

        {loading ? (
          <LoadingSpinner />
        ) : signups.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            message="No hours claimed yet. Pick a slot and join the watch."
            actionLabel="Browse the calendar"
            actionHref="/prayer-week"
          />
        ) : (
          <div className="space-y-4">
            {signups.map(s => (
              <div key={s.id} className="glass rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-heading text-lg font-semibold">{formatFullTime(s.slot.starts_at)}</div>
                    <div className="text-text-muted text-sm mt-0.5">{formatRange(s.slot.starts_at, s.slot.ends_at)}</div>
                  </div>
                  <button
                    onClick={() => handleRelease(s.id)}
                    className="text-text-muted hover:text-danger text-xs"
                  >
                    Release
                  </button>
                </div>

                {editingId === s.id ? (
                  <div className="mt-3">
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                      className="resize-none mb-2"
                      placeholder="Anything you want to remember about this hour..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveNotes(s.id)}
                        className="px-3 py-1.5 bg-gold hover:bg-gold-light text-white text-xs font-medium rounded-lg transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-border hover:border-sage text-text-secondary text-xs font-medium rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { setEditingId(s.id); setEditingNotes(s.notes || '') }}
                    className="mt-2 text-sm text-text-secondary italic cursor-pointer hover:text-text-primary"
                  >
                    {s.notes ? `"${s.notes}"` : 'Add private notes...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Helps reminder */}
        {event?.helps && signups.length > 0 && (
          <div className="glass rounded-lg p-6 mt-8">
            <h2 className="font-heading text-lg font-semibold mb-3">Prayer Helps</h2>
            <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {event.helps}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
