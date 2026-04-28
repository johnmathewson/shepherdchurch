'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'

const TZ = 'America/Chicago'

function formatDay(d) { return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d) }
function formatDate(d) { return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(d) }
function formatHour(d) { return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric' }).format(d) }
function formatFullTime(d) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(d))
}

function groupSlots(slots) {
  const days = new Map()
  for (const s of slots) {
    const d = new Date(s.starts_at)
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    if (!days.has(dayKey)) days.set(dayKey, { date: d, slots: [] })
    days.get(dayKey).slots.push(s)
  }
  return Array.from(days.values()).sort((a, b) => a.date - b.date)
}

export default function TeamPrayerWeekPage() {
  const [event, setEvent] = useState(null)
  const [slots, setSlots] = useState([])
  const [stats, setStats] = useState({ total: 0, filled: 0, open: 0, coverage_pct: 0 })
  const [authError, setAuthError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const eventRes = await fetch('/api/prayer-week/event')
      if (!eventRes.ok) {
        setLoading(false)
        return
      }
      const eventData = await eventRes.json()
      setEvent(eventData.event)

      const adminRes = await fetch(`/api/prayer-week/admin?event_id=${eventData.event.id}`)
      if (adminRes.status === 401) {
        setAuthError(true)
        setLoading(false)
        return
      }
      const adminData = await adminRes.json()
      setSlots(adminData.slots || [])
      setStats(adminData.stats || { total: 0, filled: 0, open: 0, coverage_pct: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRelease(signup_id) {
    if (!confirm('Release this signup? The slot will become open again.')) return
    try {
      const res = await fetch('/api/prayer-week/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signup_id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not release')
        return
      }
      setSelectedSlot(null)
      fetchData()
    } catch (err) {
      setError('Network error')
    }
  }

  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav variant="team" />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Team Access Required</h1>
          <Link href="/team/login" className="px-8 py-3.5 bg-gold hover:bg-gold-light text-white font-heading font-semibold rounded-lg transition-all inline-block">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen page-bg"><Nav variant="team" /><LoadingSpinner className="min-h-[60vh]" /></div>

  const days = groupSlots(slots)

  // Find longest gap (consecutive open slots)
  let longestGap = 0, currentGap = 0
  for (const s of slots) {
    if (!s.signup) currentGap++
    else { longestGap = Math.max(longestGap, currentGap); currentGap = 0 }
  }
  longestGap = Math.max(longestGap, currentGap)

  return (
    <div className="min-h-screen page-bg">
      <Nav variant="team">
        <Link href="/team" className="text-text-secondary hover:text-text-primary text-sm">Prayer Wall</Link>
      </Nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <p className="text-gold uppercase tracking-[0.3em] text-xs font-semibold mb-2">{event?.name}</p>
          <h1 className="font-heading text-3xl font-bold mb-2">Prayer Week — Coverage</h1>
        </div>

        <ErrorAlert message={error} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-lg p-5">
            <div className="text-gold text-3xl font-bold">{stats.coverage_pct}%</div>
            <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Coverage</div>
          </div>
          <div className="glass rounded-lg p-5">
            <div className="text-3xl font-bold">{stats.filled}</div>
            <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Hours filled</div>
          </div>
          <div className="glass rounded-lg p-5">
            <div className="text-3xl font-bold">{stats.open}</div>
            <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Hours open</div>
          </div>
          <div className="glass rounded-lg p-5">
            <div className="text-3xl font-bold">{longestGap}h</div>
            <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Longest gap</div>
          </div>
        </div>

        {/* Calendar — full info */}
        <div className="hidden md:block glass rounded-lg p-4 mb-8 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              <div></div>
              {days.map(d => (
                <div key={d.date.toISOString()} className="text-center">
                  <div className="text-xs text-text-muted uppercase tracking-wider">{formatDay(d.date)}</div>
                  <div className="text-sm font-semibold">{formatDate(d.date)}</div>
                </div>
              ))}
            </div>

            {Array.from({ length: 24 }).map((_, hour) => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
                <div className="text-xs text-text-muted text-right pr-2 pt-1.5">
                  {formatHour(new Date(2026, 4, 17, hour))}
                </div>
                {days.map(day => {
                  const slot = day.slots[hour]
                  if (!slot) return <div key={hour} />
                  const filled = !!slot.signup
                  const firstName = filled ? (slot.signup.display_name || '').split(' ')[0] : null
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`h-8 px-1 rounded text-[10px] font-medium transition-all truncate ${
                        filled
                          ? 'bg-sage/30 border border-sage text-text-primary hover:bg-sage/40'
                          : 'bg-danger/15 border border-danger/30 text-danger hover:bg-danger/25'
                      }`}
                    >
                      {filled ? firstName : 'Open'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile list */}
        <div className="md:hidden space-y-3 mb-8">
          {days.map(day => (
            <div key={day.date.toISOString()} className="glass rounded-lg p-4">
              <div className="font-heading font-semibold mb-2">{formatDay(day.date)} {formatDate(day.date)}</div>
              <div className="space-y-1">
                {day.slots.map(slot => {
                  const filled = !!slot.signup
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full flex items-center justify-between text-left text-sm p-2 rounded ${
                        filled ? 'bg-sage/15' : 'bg-danger/10'
                      }`}
                    >
                      <span>{formatHour(new Date(slot.starts_at))}</span>
                      <span className={filled ? 'text-text-primary' : 'text-danger'}>
                        {filled ? slot.signup.display_name : 'Open'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Slot detail modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background: 'rgba(0,0,0,0.7)'}}>
          <div className="glass-strong rounded-lg p-6 w-full max-w-md">
            <h3 className="font-heading text-xl font-bold mb-2">
              {formatFullTime(selectedSlot.starts_at)}
            </h3>
            {selectedSlot.signup ? (
              <>
                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Praying</div>
                    <div className="font-medium text-lg">{selectedSlot.signup.display_name}</div>
                  </div>
                  <div>
                    <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Email</div>
                    <a href={`mailto:${selectedSlot.signup.email}`} className="text-gold hover:text-gold-light">
                      {selectedSlot.signup.email}
                    </a>
                  </div>
                  {selectedSlot.signup.notes && (
                    <div>
                      <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Their notes (private)</div>
                      <div className="text-text-secondary italic text-sm">&ldquo;{selectedSlot.signup.notes}&rdquo;</div>
                    </div>
                  )}
                  <div>
                    <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Signed up</div>
                    <div className="text-text-secondary text-sm">{new Date(selectedSlot.signup.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="flex-1 py-3 border border-border hover:border-sage text-text-secondary font-medium rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleRelease(selectedSlot.signup.id)}
                    className="flex-1 py-3 bg-danger hover:opacity-90 text-white font-heading font-semibold rounded-lg transition-all"
                  >
                    Release Slot
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-text-secondary mb-6">This hour is currently uncovered. Reach out to someone to fill it.</p>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="w-full py-3 border border-border hover:border-sage text-text-secondary font-medium rounded-lg"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
