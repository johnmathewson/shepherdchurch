'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'

const TZ = 'America/Chicago'

function formatDay(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d)
}
function formatDate(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(d)
}
function formatHour(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric' }).format(d)
}
function formatFullTime(d) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(d)
}

// Group slots into [day][hour] for grid rendering. Day = local Chicago day.
function groupSlots(slots) {
  const days = new Map() // day_key -> { date, slots: [...] }
  for (const s of slots) {
    const d = new Date(s.starts_at)
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    if (!days.has(dayKey)) days.set(dayKey, { date: d, slots: [] })
    days.get(dayKey).slots.push(s)
  }
  return Array.from(days.values()).sort((a, b) => a.date - b.date)
}

export default function PrayerWeekPage() {
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [slots, setSlots] = useState([])
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [signupNotes, setSignupNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [holdingSlotId, setHoldingSlotId] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)
  const [showInstructions, setShowInstructions] = useState(true)

  const fetchEverything = useCallback(async () => {
    try {
      const eventRes = await fetch('/api/prayer-week/event')
      if (!eventRes.ok) {
        setLoading(false)
        return
      }
      const eventData = await eventRes.json()
      setEvent(eventData.event)

      const [slotsRes, authRes] = await Promise.all([
        fetch(`/api/prayer-week/slots?event_id=${eventData.event.id}`),
        fetch('/api/auth/check').catch(() => null),
      ])
      const slotsData = await slotsRes.json()
      setSlots(slotsData.slots || [])
      setAuthed(authRes?.ok || false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEverything() }, [fetchEverything])

  function showToast(msg) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 5000)
  }

  // After login, check for a pending hold to claim
  useEffect(() => {
    if (!authed) return
    const holdToken = sessionStorage.getItem('day_night_hold_token')
    const holdSlotId = sessionStorage.getItem('day_night_hold_slot_id')
    if (holdToken && holdSlotId) {
      // Open the modal pre-filled with this slot for confirmation
      const slot = slots.find(s => s.id === holdSlotId)
      if (slot) setSelectedSlot({ ...slot, _holdToken: holdToken })
    }
  }, [authed, slots])

  async function handleSlotClick(slot) {
    if (slot.public_status === 'filled' && !slot.mine) return
    setError('')

    if (slot.mine) {
      router.push('/prayer-week/my-slots')
      return
    }

    if (!authed) {
      // Place a hold then redirect to login
      setHoldingSlotId(slot.id)
      try {
        const res = await fetch('/api/prayer-week/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_id: slot.id }),
        })
        const data = await res.json()
        if (!res.ok) {
          showToast(data.error || 'Could not hold this slot. Please try another.')
          fetchEverything()
          setHoldingSlotId(null)
          return
        }
        sessionStorage.setItem('day_night_hold_token', data.hold_token)
        sessionStorage.setItem('day_night_hold_slot_id', slot.id)
        sessionStorage.setItem('day_night_redirect', '/prayer-week')
        router.push('/login?next=/prayer-week')
      } catch (err) {
        showToast('Network error — please try again.')
        setHoldingSlotId(null)
      }
      return
    }

    setSelectedSlot(slot)
    setSignupNotes('')
  }

  async function handleConfirm() {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      const body = selectedSlot._holdToken
        ? { hold_token: selectedSlot._holdToken, notes: signupNotes }
        : { slot_id: selectedSlot.id, notes: signupNotes }

      const res = await fetch('/api/prayer-week/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not claim slot')
        return
      }
      sessionStorage.removeItem('day_night_hold_token')
      sessionStorage.removeItem('day_night_hold_slot_id')
      setSelectedSlot(null)
      setSignupNotes('')
      fetchEverything()
    } catch (err) {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen page-bg">
        <Nav />
        <LoadingSpinner className="min-h-[60vh]" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen page-bg">
        <Nav />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">No active prayer week</h1>
          <p className="text-text-secondary">Check back soon for the next initiative.</p>
        </div>
      </div>
    )
  }

  const days = groupSlots(slots)
  const filledCount = slots.filter(s => s.public_status === 'filled').length
  const myCount = slots.filter(s => s.mine).length

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        {authed && (
          <Link href="/prayer-week/my-slots" className="text-text-secondary hover:text-text-primary text-sm">My Slots</Link>
        )}
      </Nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-gold uppercase tracking-[0.3em] text-xs font-semibold mb-3">{event.name}</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">A Week of Unbroken Prayer</h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">{event.description}</p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-text-muted">
            <div><span className="text-gold font-bold text-lg">{filledCount}</span> / {slots.length} hours covered</div>
            {authed && myCount > 0 && (
              <div><span className="text-sage font-bold text-lg">{myCount}</span> hour{myCount !== 1 ? 's' : ''} claimed by you</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {event.instructions && (
          <div className="glass rounded-lg p-6 mb-8">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="font-heading text-xl font-semibold">How it works</h2>
              <svg className={`w-5 h-5 text-text-muted transition-transform ${showInstructions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showInstructions && (
              <div className="mt-4 prose-content text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {event.instructions}
              </div>
            )}
          </div>
        )}

        {/* Calendar — Desktop grid */}
        <div className="hidden md:block glass rounded-lg p-4 mb-8 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              <div></div>
              {days.map(d => (
                <div key={d.date.toISOString()} className="text-center">
                  <div className="text-xs text-text-muted uppercase tracking-wider">{formatDay(d.date)}</div>
                  <div className="text-sm font-semibold">{formatDate(d.date)}</div>
                </div>
              ))}
            </div>

            {/* 24 rows of hours */}
            {Array.from({ length: 24 }).map((_, hour) => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
                <div className="text-xs text-text-muted text-right pr-2 pt-1.5">
                  {formatHour(new Date(2026, 4, 17, hour))}
                </div>
                {days.map(day => {
                  const slot = day.slots[hour]
                  if (!slot) return <div key={hour} />
                  const isFilled = slot.public_status === 'filled'
                  const isMine = slot.mine
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      disabled={(isFilled && !isMine) || holdingSlotId === slot.id}
                      className={`h-8 rounded text-[10px] font-medium transition-all ${
                        isMine
                          ? 'bg-gold/30 border border-gold text-gold hover:bg-gold/40'
                          : isFilled
                          ? 'bg-sage/20 border border-sage/30 text-sage cursor-not-allowed'
                          : holdingSlotId === slot.id
                          ? 'bg-gold/20 border border-gold/50 text-gold animate-pulse cursor-wait'
                          : 'bg-white/5 border border-white/10 text-text-muted hover:bg-gold/15 hover:border-gold/40 hover:text-gold cursor-pointer'
                      }`}
                    >
                      {holdingSlotId === slot.id ? '...' : isMine ? 'Mine' : isFilled ? 'Filled' : 'Open'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar — Mobile list view */}
        <div className="md:hidden space-y-3 mb-8">
          {days.map(day => (
            <div key={day.date.toISOString()} className="glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider">{formatDay(day.date)}</div>
                  <div className="font-heading font-semibold">{formatDate(day.date)}</div>
                </div>
                <div className="text-xs text-text-muted">
                  {day.slots.filter(s => s.public_status === 'filled').length} / 24 covered
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {day.slots.map(slot => {
                  const isFilled = slot.public_status === 'filled'
                  const isMine = slot.mine
                  const hour = new Date(slot.starts_at)
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      disabled={(isFilled && !isMine) || holdingSlotId === slot.id}
                      className={`py-2 rounded text-xs font-medium transition-all ${
                        isMine
                          ? 'bg-gold/30 border border-gold text-gold'
                          : isFilled
                          ? 'bg-sage/20 border border-sage/30 text-sage cursor-not-allowed'
                          : holdingSlotId === slot.id
                          ? 'bg-gold/20 border border-gold/50 text-gold animate-pulse'
                          : 'bg-white/5 border border-white/10 text-text-muted'
                      }`}
                    >
                      {holdingSlotId === slot.id ? '…' : formatHour(hour)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Helps section */}
        {event.helps && (
          <div className="glass rounded-lg p-6 mb-8">
            <h2 className="font-heading text-xl font-semibold mb-4">Prayer Helps</h2>
            <div className="prose-content text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {event.helps}
            </div>
          </div>
        )}
      </main>

      {/* Fixed toast — visible regardless of scroll position */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-danger text-white shadow-xl text-sm font-medium max-w-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="ml-1 text-white/70 hover:text-white leading-none">✕</button>
          </div>
        </div>
      )}

      {/* Sign-up modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in" style={{background: 'rgba(0,0,0,0.7)'}}>
          <div className="glass-strong rounded-lg p-6 w-full max-w-md">
            <h3 className="font-heading text-xl font-bold mb-2">Claim this hour</h3>
            <p className="text-text-secondary text-sm mb-1">
              {formatFullTime(new Date(selectedSlot.starts_at))}
            </p>
            <p className="text-gold text-xs mb-5">All times in Chicago (CDT)</p>

            <ErrorAlert message={error} />

            <label className="block text-sm font-medium text-text-secondary mb-2">
              Private notes (optional)
            </label>
            <textarea
              value={signupNotes}
              onChange={(e) => setSignupNotes(e.target.value)}
              placeholder="Anything you want to remember about this hour..."
              rows={3}
              className="resize-none mb-1"
            />
            <p className="text-xs text-text-muted mb-5">Only you will see this.</p>

            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedSlot(null); setSignupNotes(''); setError('') }}
                className="flex-1 py-3 border border-border hover:border-sage text-text-secondary font-medium rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-3 bg-gold hover:bg-gold-light text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {submitting ? 'Claiming...' : 'Claim This Hour'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
