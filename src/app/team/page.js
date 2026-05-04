'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import TeamSidebar from '@/components/TeamSidebar'
import { useRealtimeSubscription } from '@/lib/realtime'

const FILTER_LABELS = {
  all: 'All Requests',
  pending: 'Awaiting Prayer',
  active: 'Being Prayed For',
  my_pickups: 'My Pickups',
  answered: 'Answered',
  archived: 'Archived',
}

// Order intentionally puts urgent/actionable filters first on mobile.
const MOBILE_FILTERS = ['pending', 'active', 'my_pickups', 'all', 'answered', 'archived']

export default function TeamDashboardPage() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [authError, setAuthError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/requests?mode=team')
      if (res.status === 401) {
        setAuthError(true)
        return
      }
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])
  useRealtimeSubscription('prayer_requests', null, () => fetchRequests())
  useRealtimeSubscription('prayer_pickups', null, () => fetchRequests())

  async function handlePickup(requestId) {
    try {
      const res = await fetch('/api/pickups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })
      if (res.ok) fetchRequests()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = requests.filter(r => {
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'active') return r.status === 'active'
    if (filter === 'my_pickups') return r.picked_up_by_me
    if (filter === 'answered') return r.status === 'answered'
    if (filter === 'archived') return r.status === 'archived'
    return r.status !== 'answered' && r.status !== 'archived'
  })

  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav variant="team" />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Team Access Required</h1>
          <p className="text-text-secondary mb-8">Please sign in with your Planning Center account.</p>
          <Link href="/team/login" className="px-8 py-3.5 bg-purple hover:bg-purple-light text-white font-heading font-semibold rounded-lg transition-all inline-block">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const counts = {
    all: requests.filter(r => r.status !== 'answered' && r.status !== 'archived').length,
    pending: requests.filter(r => r.status === 'pending').length,
    active: requests.filter(r => r.status === 'active').length,
    my_pickups: requests.filter(r => r.picked_up_by_me).length,
    answered: requests.filter(r => r.status === 'answered').length,
    archived: requests.filter(r => r.status === 'archived').length,
  }

  return (
    // Sidebar is `position: fixed` (always). On desktop we reserve its 16rem
    // slot via `md:pl-64` so content sits beside it; on mobile no padding
    // reservation, so content is full-width and the sidebar overlays only when
    // the user opens it.
    <div className="min-h-screen page-bg md:pl-64">
      <TeamSidebar
        filter={filter}
        onFilter={setFilter}
        counts={counts}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      <div className="flex flex-col min-h-screen">
        {/* MOBILE topbar — clean, compact, replaces the loud floating Menu pill. */}
        <header className="md:hidden glass-nav sticky top-0 z-30 px-3 py-3 flex items-center gap-3 border-b border-border-glass">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-heading text-base font-semibold truncate">{FILTER_LABELS[filter]}</div>
            <div className="text-[11px] text-text-muted">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</div>
          </div>
        </header>

        {/* MOBILE filter chip rail — sticky, horizontal scroll, urgent filters first. */}
        <div className="md:hidden sticky top-[64px] z-20 px-3 py-2.5 bg-bg-deep/85 backdrop-blur-md border-b border-border-glass">
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-3 px-3" style={{ scrollbarWidth: 'none' }}>
            {MOBILE_FILTERS.map((key) => {
              const active = filter === key
              const count = counts[key] ?? 0
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`
                    shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all
                    ${active
                      ? 'bg-gold text-black shadow-sm shadow-gold/30'
                      : 'bg-white/5 text-text-secondary border border-border-glass hover:bg-white/8 hover:text-text-primary'}
                  `}
                >
                  <span>{FILTER_LABELS[key]}</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 rounded-full ${active ? 'bg-black/20' : 'bg-white/8 text-text-muted'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <main className="flex-1 px-4 md:px-6 py-4 md:py-8 md:pl-8 md:pt-8 max-w-6xl w-full mx-auto">
          {/* Desktop-only header (mobile gets the topbar above) */}
          <div className="hidden md:flex items-center justify-between mb-8">
            <h1 className="font-heading text-2xl md:text-3xl font-bold">{FILTER_LABELS[filter] || 'Prayer Requests'}</h1>
            <div className="text-text-muted text-sm">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="text-text-muted text-sm">No prayer requests in this view.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {filtered.map((req) => (
                <RequestCard key={req.id} req={req} onPickup={handlePickup} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// Card component — mobile-first, compact, single primary action.
// ============================================================================
function RequestCard({ req, onPickup }) {
  const date = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const pickedUp = !!req.picked_up_by_me

  // Pick Up is nested inside the card-wide Link. The button's preventDefault +
  // stopPropagation keeps the tap from also triggering the Link navigation.
  function handlePickupClick(e) {
    e.preventDefault()
    e.stopPropagation()
    onPickup(req.id)
  }

  return (
    <Link
      href={`/team/request/${req.id}`}
      className="block glass rounded-xl p-4 md:p-5 hover:border-gold/40 transition-colors active:scale-[0.99]"
    >
      {/* Top row: category chip + date */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <Badge type="category" value={req.category} />
        <span className="text-[11px] text-text-muted whitespace-nowrap">{date}</span>
      </div>

      {/* Title */}
      <h3 className="font-heading text-[1rem] md:text-lg font-semibold leading-snug mb-2 break-words">
        {req.title}
      </h3>

      {/* Description — clamped */}
      <p className="text-text-secondary text-[0.86rem] md:text-sm leading-relaxed line-clamp-3 mb-4">
        {req.description}
      </p>

      {/* Action row: pickup count on the left; quick "Pick Up" on the right
          (only when current user hasn't picked it up). The card itself is the
          primary tap target — it opens the detail page on tap anywhere. */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{req.pickup_count} praying</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {!pickedUp ? (
            <button
              onClick={handlePickupClick}
              className="px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Pick Up
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gold/15 text-gold border border-gold/30">
              Picked up
            </span>
          )}
          <span className="inline-flex items-center text-text-muted" aria-hidden="true">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
