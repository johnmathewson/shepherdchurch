'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import { useRealtimeSubscription } from '@/lib/realtime'

export default function RequestDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [request, setRequest] = useState(null)
  const [words, setWords] = useState([])
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Update form state
  const [updateText, setUpdateText] = useState('')
  const [submittingUpdate, setSubmittingUpdate] = useState(false)

  // Mark-as-answered modal state
  const [showAnsweredModal, setShowAnsweredModal] = useState(false)
  const [testimony, setTestimony] = useState('')
  const [sharePublicly, setSharePublicly] = useState(true)
  const [submittingAnswered, setSubmittingAnswered] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, wordRes, updatesRes] = await Promise.all([
        fetch('/api/requests'),
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

  useRealtimeSubscription('prophetic_words', `prayer_request_id=eq.${id}`, () => fetchData())

  async function handleSubmitUpdate(e) {
    e.preventDefault()
    if (!updateText.trim()) return
    setSubmittingUpdate(true)
    setError('')
    try {
      const res = await fetch(`/api/requests/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updateText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save update')
      setUpdateText('')
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmittingUpdate(false)
    }
  }

  async function handleMarkAnswered(e) {
    e.preventDefault()
    if (!testimony.trim()) return
    setSubmittingAnswered(true)
    setError('')
    try {
      const res = await fetch(`/api/requests/${id}/answered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimony, share_publicly: sharePublicly }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not mark answered')
      setShowAnsweredModal(false)
      setTestimony('')
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmittingAnswered(false)
    }
  }

  async function handleArchive() {
    if (!confirm('Archive this request? It will no longer appear on your active list.')) return
    try {
      const res = await fetch(`/api/requests/${id}/archive`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not archive')
        return
      }
      router.push('/dashboard')
    } catch (err) {
      setError('Network error')
    }
  }

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

  const isAnswered = request.status === 'answered'
  const isArchived = request.status === 'archived'

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm">Back to Dashboard</Link>
      </Nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-fade-in">
          <ErrorAlert message={error} />

          {/* Request details */}
          <div className="glass rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Badge type="category" value={request.category} />
              <span className="text-text-muted text-xs">
                Submitted {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="ml-auto"><Badge type="status" value={request.status} className="text-sm" /></span>
            </div>
            <h1 className="font-heading text-2xl font-bold mb-3">{request.title}</h1>
            <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Answered testimony banner */}
          {isAnswered && request.outcome_note && (
            <div className="glass rounded-lg p-6 mb-8 border-l-4 border-gold">
              <div className="flex items-center gap-2 text-gold text-xs uppercase tracking-wider font-semibold mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Your Testimony
              </div>
              <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{request.outcome_note}</p>
              {request.share_publicly && (
                <p className="mt-3 text-text-muted text-xs">
                  ✓ Shared on the public Answered Prayers wall
                </p>
              )}
            </div>
          )}

          {/* Add Update + Mark Answered actions */}
          {!isAnswered && !isArchived && (
            <>
              <div className="glass rounded-lg p-6 mb-8">
                <h3 className="font-heading text-lg font-semibold mb-2">Add an Update</h3>
                <p className="text-text-muted text-sm mb-4">
                  Share where things stand. The prayer team will see your updates as they continue praying.
                </p>
                <form onSubmit={handleSubmitUpdate}>
                  <textarea
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    rows={3}
                    placeholder="Here's where things stand..."
                    className="resize-none mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingUpdate || !updateText.trim()}
                      className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-all text-sm disabled:opacity-50"
                    >
                      {submittingUpdate ? 'Saving...' : 'Post Update'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnsweredModal(true)}
                      className="px-5 py-2.5 bg-gold hover:bg-gold-light text-white font-heading font-semibold rounded-lg transition-all text-sm"
                    >
                      Mark as Answered
                    </button>
                    <button
                      type="button"
                      onClick={handleArchive}
                      className="ml-auto text-text-muted hover:text-danger text-xs"
                    >
                      Archive
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* Updates timeline */}
          {updates.length > 0 && (
            <>
              <h2 className="font-heading text-xl font-bold mb-4">Your Updates</h2>
              <div className="space-y-3 mb-8">
                {updates.map(u => (
                  <div key={u.id} className={`glass rounded-lg p-5 ${u.is_answer ? 'border-l-2 border-gold' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {u.is_answer && (
                        <span className="text-gold text-xs uppercase tracking-wider font-semibold">Testimony</span>
                      )}
                      <span className="text-text-muted text-xs">
                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{u.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}

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

      {/* Mark Answered Modal */}
      {showAnsweredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in" style={{background: 'rgba(0,0,0,0.7)'}}>
          <div className="glass-strong rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2 text-gold text-xs uppercase tracking-wider font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Praise Report
            </div>
            <h2 className="font-heading text-2xl font-bold mb-3">What did God do?</h2>
            <p className="text-text-secondary text-sm mb-5 leading-relaxed">
              Your story could give someone else hope. Take a few minutes to share how God moved —
              even if the answer was different than expected. Faith grows through testimony.
            </p>

            <ErrorAlert message={error} />

            <form onSubmit={handleMarkAnswered}>
              <textarea
                value={testimony}
                onChange={(e) => setTestimony(e.target.value)}
                rows={8}
                placeholder="Share your testimony..."
                required
                className="resize-none mb-4"
              />

              <label className="flex items-start gap-3 mb-5 cursor-pointer p-3 rounded-lg border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-all">
                <input
                  type="checkbox"
                  checked={sharePublicly}
                  onChange={(e) => setSharePublicly(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gold flex-shrink-0"
                  style={{ width: 'auto' }}
                />
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    Share anonymously on the Answered Prayers wall
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Your name and email stay private. Only the testimony is shared.
                  </div>
                </div>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAnsweredModal(false)}
                  className="flex-1 py-3 border border-border hover:border-sage text-text-secondary font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAnswered || !testimony.trim()}
                  className="flex-1 py-3 bg-gold hover:bg-gold-light text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {submittingAnswered ? 'Sharing...' : 'Mark as Answered'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
