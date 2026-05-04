'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import { useRealtimeSubscription } from '@/lib/realtime'

export default function DashboardPage() {
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [authError, setAuthError] = useState(false)

  // Prayer Initiative is intentionally NOT promoted to visitors here — it's
  // a Shepherd member commitment, surfaced in the team sidebar at /team.
  // The /prayer-week page remains publicly reachable for anyone with the link.

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/notifications'),
      ])

      if (reqRes.status === 401) {
        setAuthError(true)
        setLoading(false)
        return
      }

      const reqData = await reqRes.json()
      const notifData = await notifRes.json()

      setRequests(reqData.requests || [])
      setNotifications(notifData.notifications || [])
      setUnreadCount(notifData.unread_count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeSubscription('notifications', null, () => { fetchData() })
  useRealtimeSubscription('prayer_requests', null, () => { fetchData() })

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true }),
    })
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  if (authError) {
    return (
      <div className="min-h-screen page-bg">
        <Nav />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Sign In to View Dashboard</h1>
          <p className="text-text-secondary mb-8">You need to sign in first to view your prayer requests.</p>
          <Link href="/login" className="px-8 py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all inline-block">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-sage text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <Link href="/submit" className="text-sm px-4 py-2 bg-sage hover:bg-sage-dark text-white rounded-lg font-medium transition-all">
          New Request
        </Link>
      </Nav>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Notifications dropdown */}
        {showNotifications && (
          <div className="mb-6 glass rounded-lg overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-glass">
              <h3 className="font-heading font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-sage hover:text-sage-light">Mark all as read</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-5 py-8 text-text-muted text-center text-sm">No notifications yet</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`px-5 py-3 border-b border-border/50 ${!n.read ? 'bg-sage/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-sage' : 'bg-border'}`} />
                      <div>
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-10">

            {/* ── Prayer Requests ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold">My Prayer Requests</h2>
                <Link href="/submit" className="text-sm text-sage hover:text-sage-light">
                  New request →
                </Link>
              </div>

              {requests.length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                  message="You haven't submitted any prayer requests yet."
                  actionLabel="Submit your first request"
                  actionHref="/submit"
                />
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <Link
                      key={req.id}
                      href={`/dashboard/request/${req.id}`}
                      className="block glass rounded-lg p-5 hover:border-sage/40 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-heading font-semibold text-lg group-hover:text-sage transition-colors">{req.title}</h3>
                        <Badge type="status" value={req.status} />
                      </div>
                      <p className="text-text-secondary text-sm line-clamp-2 mb-3">{req.description}</p>
                      <div className="flex items-center gap-3">
                        <Badge type="category" value={req.category} />
                        <span className="text-text-muted text-xs">
                          {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  )
}
