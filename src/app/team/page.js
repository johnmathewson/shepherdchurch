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

export default function TeamDashboardPage() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [authError, setAuthError] = useState(false)

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

  // Live updates — new requests appear automatically
  useRealtimeSubscription('prayer_requests', null, () => {
    fetchRequests()
  })

  useRealtimeSubscription('prayer_pickups', null, () => {
    fetchRequests()
  })

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
    // Default "all" view: hide answered and archived to keep the wall focused on active prayer
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

  // Counts for sidebar badges
  const counts = {
    all: requests.filter(r => r.status !== 'answered' && r.status !== 'archived').length,
    pending: requests.filter(r => r.status === 'pending').length,
    active: requests.filter(r => r.status === 'active').length,
    my_pickups: requests.filter(r => r.picked_up_by_me).length,
    answered: requests.filter(r => r.status === 'answered').length,
    archived: requests.filter(r => r.status === 'archived').length,
  }

  return (
    <div className="min-h-screen page-bg flex">
      <TeamSidebar filter={filter} onFilter={setFilter} counts={counts} />

      <main className="flex-1 px-6 py-8 md:pl-8 md:pt-8 pt-20 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{FILTER_LABELS[filter] || 'Prayer Requests'}</h1>
          <div className="text-text-muted text-sm">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted">No prayer requests in this view.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="glass rounded-lg p-5 hover:border-purple/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge type="category" value={req.category} />
                  <span className="text-text-muted text-xs">
                    {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{req.title}</h3>
                <p className="text-text-secondary text-sm line-clamp-3 mb-4">{req.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-text-muted text-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {req.pickup_count} praying
                  </div>
                  <div className="flex gap-2">
                    {!req.picked_up_by_me && (
                      <button
                        onClick={() => handlePickup(req.id)}
                        className="px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-medium rounded-lg transition-all"
                      >
                        Pick Up & Pray
                      </button>
                    )}
                    <Link
                      href={`/team/request/${req.id}`}
                      className="px-3 py-1.5 border border-border hover:border-purple text-text-secondary text-xs font-medium rounded-lg transition-all"
                    >
                      {req.picked_up_by_me ? 'View & Add Notes' : 'View Details'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
