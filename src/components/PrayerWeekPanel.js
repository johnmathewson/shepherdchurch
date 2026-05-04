'use client'

import { useState, useEffect, useCallback } from 'react'
import LoadingSpinner from './LoadingSpinner'

const TZ = 'America/Chicago'

function fmtDay(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d)
}
function fmtDate(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(d)
}
function fmtHour(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric' }).format(d)
}
function fmtFullTime(d) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(d))
}

function groupSlotsByDay(slots) {
  const days = new Map()
  for (const s of slots) {
    const d = new Date(s.starts_at)
    const dayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d)
    if (!days.has(dayKey)) days.set(dayKey, { date: d, slots: [] })
    days.get(dayKey).slots.push(s)
  }
  return Array.from(days.values()).sort((a, b) => a.date - b.date)
}

/**
 * Shared Prayer Week panel — used on /team/admin (Prayer Initiative tab,
 * mode='admin') and /team/prayer-week (mode='team').
 *
 * In team mode: no emails, no Release button. The slot grid still shows
 * who's signed up by name so team members can pray over their teammates'
 * watches; admin actions are reserved for /team/admin.
 */
export default function PrayerWeekPanel({ mode = 'team' }) {
  const isAdmin = mode === 'admin'

  const [event, setEvent] = useState(null)
  const [slots, setSlots] = useState([])
  const [stats, setStats] = useState({ total: 0, filled: 0, open: 0, coverage_pct: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const eventRes = await fetch('/api/prayer-week/event')
      if (!eventRes.ok) {
        setLoading(false)
        return
      }
      const eventData = await eventRes.json()
      if (!eventData.event) {
        setLoading(false)
        return
      }
      setEvent(eventData.event)

      const adminRes = await fetch(`/api/prayer-week/admin?event_id=${eventData.event.id}`)
      if (adminRes.status === 401 || adminRes.status === 403) {
        setAuthError(true)
        setLoading(false)
        return
      }
      const adminData = await adminRes.json()
      setSlots(adminData.slots || [])
      setStats(adminData.stats || { total: 0, filled: 0, open: 0, coverage_pct: 0 })
    } catch (err) {
      console.error(err)
      setError('Could not load prayer week data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRelease(signup_id) {
    if (!isAdmin) return
    if (!confirm('Release this signup? The slot will become open again and they will not be notified.')) return
    setError('')
    try {
      const res = await fetch('/api/prayer-week/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signup_id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not release signup.')
        return
      }
      setSelectedSlot(null)
      fetchData()
    } catch {
      setError('Network error while releasing signup.')
    }
  }

  if (loading) {
    return <div className="py-16"><LoadingSpinner /></div>
  }

  if (authError) {
    return (
      <div className="glass-elevated p-8 text-center">
        <h3 className="font-heading text-xl font-bold mb-2">Team access required</h3>
        <p className="text-text-secondary text-sm">You need a prayer team session to view this.</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="glass-elevated p-8 text-center">
        <div className="text-4xl mb-3">🕊️</div>
        <h3 className="font-heading text-xl font-bold mb-2">No prayer initiative active</h3>
        <p className="text-text-secondary text-sm">When the next 24/7 prayer week is published, the coverage view will appear here.</p>
      </div>
    )
  }

  // Longest stretch of uncovered slots (gives a sense of where help is needed)
  let longestGap = 0, currentGap = 0
  for (const s of slots) {
    if (!s.signup) currentGap++
    else { longestGap = Math.max(longestGap, currentGap); currentGap = 0 }
  }
  longestGap = Math.max(longestGap, currentGap)

  const days = groupSlotsByDay(slots)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header band */}
      <div>
        <p className="text-gold uppercase tracking-[0.3em] text-xs font-semibold mb-1">{event.name}</p>
        <h2 className="font-heading text-2xl md:text-3xl font-bold">A Week of Unbroken Prayer</h2>
        {event.description && (
          <p className="text-text-secondary text-sm mt-2 max-w-2xl">{event.description}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Coverage hero — ring + breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-stretch">
        <div className="glass-elevated p-6 flex items-center gap-5">
          <div
            className="coverage-ring"
            style={{ '--pct': stats.coverage_pct }}
            aria-label={`${stats.coverage_pct}% covered`}
          >
            <div className="text-center">
              <div className="font-heading text-2xl font-bold text-gold leading-none">{stats.coverage_pct}%</div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">Covered</div>
            </div>
          </div>
          <div>
            <div className="text-text-muted text-xs uppercase tracking-wider">Coverage</div>
            <div className="font-heading text-lg font-semibold mt-0.5">
              {stats.filled} of {stats.total} hours
            </div>
            <div className="text-text-secondary text-xs mt-1">
              {stats.open === 0 ? 'Every hour is covered.' : `${stats.open} hour${stats.open === 1 ? '' : 's'} still open.`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Hours Filled" value={stats.filled} accent="sage" />
          <StatTile label="Hours Open" value={stats.open} accent={stats.open > 0 ? 'danger' : 'muted'} />
          <StatTile label="Longest Gap" value={`${longestGap}h`} accent={longestGap > 2 ? 'warning' : 'muted'} />
        </div>
      </div>

      {/* Desktop calendar */}
      <div className="hidden md:block glass-elevated p-5 overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-2">
            <div></div>
            {days.map(d => (
              <div key={d.date.toISOString()} className="text-center pb-2">
                <div className="text-[10px] text-text-muted uppercase tracking-[0.15em]">{fmtDay(d.date)}</div>
                <div className="text-sm font-semibold mt-0.5">{fmtDate(d.date)}</div>
              </div>
            ))}
          </div>

          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              <div className="text-[11px] text-text-muted text-right pr-2 pt-1.5">
                {fmtHour(new Date(2026, 4, 17, hour))}
              </div>
              {days.map((day, di) => {
                const slot = day.slots[hour]
                if (!slot) return <div key={di} />
                const filled = !!slot.signup
                const firstName = filled ? (slot.signup.display_name || '').split(' ')[0] : null
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-9 px-1.5 rounded-md text-[11px] font-medium transition-all truncate ${
                      filled
                        ? 'bg-sage/25 border border-sage/50 text-text-primary hover:bg-sage/40 hover:border-sage'
                        : 'bg-danger/15 border border-danger/30 text-danger/90 hover:bg-danger/25 hover:border-danger/60'
                    }`}
                    title={filled ? slot.signup.display_name : 'Open hour'}
                  >
                    {filled ? firstName : 'Open'}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile day list */}
      <div className="md:hidden space-y-3">
        {days.map(day => (
          <div key={day.date.toISOString()} className="glass-elevated p-4">
            <div className="font-heading font-semibold mb-3">{fmtDay(day.date)} {fmtDate(day.date)}</div>
            <div className="space-y-1.5">
              {day.slots.map(slot => {
                const filled = !!slot.signup
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full flex items-center justify-between text-left text-sm px-3 py-2 rounded-md transition-colors ${
                      filled
                        ? 'bg-sage/15 hover:bg-sage/25 text-text-primary'
                        : 'bg-danger/10 hover:bg-danger/20 text-danger'
                    }`}
                  >
                    <span className="text-text-muted">{fmtHour(new Date(slot.starts_at))}</span>
                    <span>{filled ? slot.signup.display_name : 'Open'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Slot detail modal */}
      {selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="glass-elevated p-7 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-gold uppercase text-[10px] tracking-[0.25em] font-semibold mb-1">
                  {selectedSlot.signup ? 'Hour Covered' : 'Hour Open'}
                </p>
                <h3 className="font-heading text-lg font-bold leading-snug">
                  {fmtFullTime(selectedSlot.starts_at)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                aria-label="Close"
              >×</button>
            </div>

            {selectedSlot.signup ? (
              <>
                <div className="space-y-3.5 mb-6 mt-5">
                  <Field label="Praying">
                    <span className="text-base font-medium text-text-primary">{selectedSlot.signup.display_name}</span>
                  </Field>
                  {isAdmin && selectedSlot.signup.email && (
                    <Field label="Email">
                      <a href={`mailto:${selectedSlot.signup.email}`} className="text-gold hover:text-gold-light text-sm">
                        {selectedSlot.signup.email}
                      </a>
                    </Field>
                  )}
                  {selectedSlot.signup.notes && (
                    <Field label={isAdmin ? 'Their notes (private)' : 'Notes'}>
                      <span className="text-text-secondary text-sm italic">&ldquo;{selectedSlot.signup.notes}&rdquo;</span>
                    </Field>
                  )}
                  <Field label="Signed up">
                    <span className="text-text-secondary text-sm">
                      {new Date(selectedSlot.signup.created_at).toLocaleString()}
                    </span>
                  </Field>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="flex-1 py-2.5 border border-border hover:border-white/30 text-text-secondary text-sm font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleRelease(selectedSlot.signup.id)}
                      className="flex-1 py-2.5 bg-danger/90 hover:bg-danger text-white text-sm font-heading font-semibold rounded-lg transition-colors"
                    >
                      Release Slot
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-text-secondary text-sm mt-4 mb-6">
                  This hour is currently uncovered. {isAdmin
                    ? 'Reach out to someone on the team to fill it.'
                    : 'Pray for someone to step into this watch.'}
                </p>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="w-full py-2.5 border border-border hover:border-white/30 text-text-secondary text-sm font-medium rounded-lg transition-colors"
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

function StatTile({ label, value, accent = 'muted' }) {
  const accentColor = {
    sage: 'text-sage',
    danger: 'text-danger',
    warning: 'text-warning',
    muted: 'text-text-primary',
  }[accent] || 'text-text-primary'
  return (
    <div className="glass-elevated p-4 flex flex-col justify-between min-h-[88px]">
      <div className={`font-heading text-2xl font-bold ${accentColor}`}>{value}</div>
      <div className="text-text-muted text-[10px] uppercase tracking-[0.15em] mt-2">{label}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-text-muted text-[10px] uppercase tracking-[0.18em] font-semibold mb-1">{label}</div>
      {children}
    </div>
  )
}
