'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useRealtimeSubscription } from '@/lib/realtime'

export default function RequestDetailPage({ params }) {
  const { id } = use(params)
  const [request, setRequest] = useState(null)
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, wordRes] = await Promise.all([
        fetch('/api/requests'),
        fetch(`/api/prophetic?request_id=${id}`),
      ])
      const reqData = await reqRes.json()
      const wordData = await wordRes.json()

      const found = (reqData.requests || []).find(r => r.id === id)
      setRequest(found || null)
      setWords(wordData.words || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // Live updates for new prophetic words
  useRealtimeSubscription('prophetic_words', `prayer_request_id=eq.${id}`, () => {
    fetchData()
  })

  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!request) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-text-secondary">Request not found.</p>
          <Link href="/dashboard" className="text-sage mt-4 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm">Back to Dashboard</Link>
      </Nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-fade-in">
          {/* Request details */}
          <div className="glass rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge type="category" value={request.category} />
              <span className="text-text-muted text-xs">
                Submitted {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold mb-3">{request.title}</h1>
            <p className="text-text-secondary leading-relaxed">{request.description}</p>
            <div className="mt-4 pt-4 border-t border-border">
              <Badge type="status" value={request.status} className="text-sm" />
            </div>
          </div>

          {/* Prophetic Words */}
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Prophetic Words & Notes
          </h2>

          {words.length === 0 ? (
            <div className="glass rounded-lg p-8 text-center">
              <p className="text-text-muted text-sm">No prophetic words have been shared yet. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {words.map((word) => (
                <div key={word.id} className="glass rounded-lg p-5 border-sage/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-sage">Prayer Team Member</span>
                      <span className="text-text-muted text-xs ml-2">
                        {new Date(word.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-text-primary leading-relaxed italic">&ldquo;{word.content}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
