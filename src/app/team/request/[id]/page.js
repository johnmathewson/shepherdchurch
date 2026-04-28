'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useRealtimeSubscription } from '@/lib/realtime'

export default function TeamRequestDetailPage({ params }) {
  const { id } = use(params)
  const [request, setRequest] = useState(null)
  const [words, setWords] = useState([])
  const [updates, setUpdates] = useState([])
  const [newWord, setNewWord] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pickingUp, setPickingUp] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, wordRes, updatesRes] = await Promise.all([
        fetch('/api/requests?mode=team'),
        fetch(`/api/prophetic?request_id=${id}`),
        fetch(`/api/requests/${id}/updates`),
      ])
      const reqData = await reqRes.json()
      const wordData = await wordRes.json()
      const updatesData = await updatesRes.json()

      const found = (reqData.requests || []).find(r => r.id === id)
      setRequest(found || null)
      setWords(wordData.words || [])
      setUpdates(updatesData.updates || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // Live updates for prophetic words
  useRealtimeSubscription('prophetic_words', `prayer_request_id=eq.${id}`, () => {
    fetchData()
  })

  async function handlePickup() {
    setPickingUp(true)
    try {
      await fetch('/api/pickups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id }),
      })
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setPickingUp(false)
    }
  }

  async function handleSubmitWord(e) {
    e.preventDefault()
    if (!newWord.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/prophetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id, content: newWord }),
      })
      if (res.ok) {
        setNewWord('')
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!request) {
    return (
      <div className="min-h-screen">
        <Nav variant="team" />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-text-secondary">Request not found.</p>
          <Link href="/team" className="text-purple mt-4 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav variant="team">
        <Link href="/team" className="text-text-secondary hover:text-text-primary text-sm">Back to Dashboard</Link>
      </Nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-fade-in">
          {/* Request info — anonymous */}
          <div className="glass rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge type="category" value={request.category} />
              <span className="text-text-muted text-xs">
                {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-text-muted text-xs ml-auto">
                {request.pickup_count} team member{request.pickup_count !== 1 ? 's' : ''} praying
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold mb-3">{request.title}</h1>
            <p className="text-text-secondary leading-relaxed">{request.description}</p>

            {!request.picked_up_by_me && request.status !== 'answered' && request.status !== 'archived' && (
              <div className="mt-6 pt-4 border-t border-border">
                <button
                  onClick={handlePickup}
                  disabled={pickingUp}
                  className="px-6 py-3 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {pickingUp ? 'Picking up...' : 'Pick Up This Request & Pray'}
                </button>
              </div>
            )}
          </div>

          {/* Answered testimony banner — visible to team when visitor marked answered */}
          {request.status === 'answered' && request.outcome_note && (
            <div className="glass rounded-lg p-6 mb-8 border-l-4 border-gold">
              <div className="flex items-center gap-2 text-gold text-xs uppercase tracking-wider font-semibold mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Praise Report from the Visitor
              </div>
              <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{request.outcome_note}</p>
            </div>
          )}

          {/* Visitor updates timeline */}
          {updates.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading text-lg font-bold mb-3">Updates from the Visitor</h2>
              <div className="space-y-3">
                {updates.map(u => (
                  <div key={u.id} className={`glass rounded-lg p-4 ${u.is_answer ? 'border-l-2 border-gold' : ''}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {u.is_answer && (
                        <span className="text-gold text-xs uppercase tracking-wider font-semibold">Testimony</span>
                      )}
                      <span className="text-text-muted text-xs">
                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{u.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add prophetic word */}
          {request.picked_up_by_me && (
            <div className="glass-strong rounded-lg p-6 mb-8 border-purple/30">
              <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Share a Prophetic Word or Note
              </h2>
              <p className="text-text-secondary text-sm mb-4">
                As you pray, share what you hear from the Lord. This will be visible to the person who submitted the request.
              </p>
              <form onSubmit={handleSubmitWord}>
                <textarea
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="I sense the Lord saying..."
                  rows={4}
                  className="mb-3 resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-purple hover:bg-purple-light text-white font-medium rounded-lg transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Sharing...' : 'Share Prophetic Word'}
                </button>
              </form>
            </div>
          )}

          {/* Existing prophetic words */}
          <h2 className="font-heading text-xl font-bold mb-4">
            Prophetic Words & Notes ({words.length})
          </h2>
          {words.length === 0 ? (
            <div className="glass rounded-lg p-8 text-center">
              <p className="text-text-muted text-sm">No prophetic words have been shared yet for this request.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {words.map((word) => (
                <div key={word.id} className="glass rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <span className="text-text-muted text-xs">
                      {new Date(word.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
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
