'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useRealtimeSubscription } from '@/lib/realtime'

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
    return true
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

  return (
    <div className="min-h-screen page-bg">
      <Nav variant="team">
        <Link href="/team/prayer-week" className="text-text-secondary hover:text-text-primary text-sm">Day/Night</Link>
        <Link href="/team/admin" className="text-text-secondary hover:text-text-primary text-sm">Admin</Link>
        <button
          onClick={async () => {
            await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
            router.push('/')
          }}
          className="text-text-muted hover:text-danger text-sm"
        >
          Logout
        </button>
      </Nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold">Prayer Requests</h1>
          <div className="text-text-muted text-sm">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All Requests' },
            { key: 'pending', label: 'Awaiting Prayer' },
            { key: 'active', label: 'Being Prayed For' },
            { key: 'my_pickups', label: 'My Pickups' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? 'bg-purple text-white'
                  : 'glass text-text-secondary hover:border-purple/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
