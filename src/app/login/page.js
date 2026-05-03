'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Nav from '@/components/Nav'
import ErrorAlert from '@/components/ErrorAlert'

const errorMessages = {
  oauth_denied: 'Authorization was denied. Please try again.',
  no_code: 'No authorization code received. Please try again.',
  token_exchange: 'Your sign-in link has expired or already been used. Send a new one below.',
  profile_fetch: 'Could not retrieve your profile. Please try again.',
  server_error: 'Something went wrong on our end. Please try again.',
  unexpected: 'An unexpected error occurred. Please try again.',
  no_token: 'Sign-in handoff was incomplete. Please try again.',
  invalid_token: 'Sign-in handoff could not be verified. Please try again.',
}

function LoginContent() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const errorDetail = searchParams.get('detail')
  const next = searchParams.get('next') || '/dashboard'
  const friendlyError = errorCode ? errorMessages[errorCode] || 'An error occurred.' : ''
  const initialError = errorDetail && errorCode
    ? `${friendlyError} [${errorCode}] ${errorDetail}`
    : friendlyError

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(initialError)

  // state encodes origin (for error routing) and optionally the post-login destination.
  // Format: "visitor" or "visitor:/some/path" — the callback parses the colon to get `next`.
  // Team login always uses state=team (no next needed — always lands on /team).
  const stateParam = `visitor${next && next !== '/dashboard' ? ':' + encodeURIComponent(next) : ''}`
  const pcAuthUrl = `https://api.planningcenteronline.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_PLANNING_CENTER_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_PLANNING_CENTER_REDIRECT_URI || '')}&response_type=code&scope=people+services&state=${stateParam}`

  async function handleSendLink(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visitor_magic_link', email, next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send the sign-in link.')
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleUseDifferentEmail() {
    setSent(false)
    setEmail('')
    setError('')
  }

  return (
    <div className="animate-fade-in glass rounded-lg p-8">
      <h1 className="font-heading text-3xl font-bold mb-2">Sign In</h1>
      <p className="text-text-secondary mb-8">
        We&apos;ll email you a one-time sign-in link — no password needed.
      </p>

      <ErrorAlert message={error} />

      {sent ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-sage/30 bg-sage/5 p-5">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="text-sm text-text-secondary leading-relaxed">
                <strong className="text-text-primary block mb-1">Check your email.</strong>
                We sent a sign-in link to <strong className="text-text-primary">{email}</strong>.
                Click it to finish signing in. The link works for one hour.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseDifferentEmail}
            className="text-sage hover:text-sage-light text-sm font-medium"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendLink} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all shadow-lg shadow-sage/20 disabled:opacity-50"
          >
            {loading ? (
              'Sending link…'
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send me a sign-in link
              </>
            )}
          </button>
        </form>
      )}

      {/* Secondary: serve-team / Planning Center sign-in */}
      <div className="mt-10 pt-6 border-t border-border">
        <p className="text-text-muted text-xs uppercase tracking-wider mb-3">For prayer team members</p>
        <a
          href={pcAuthUrl}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Sign in with Planning Center →
        </a>
        <p className="mt-2 text-text-muted text-xs">
          Use this only if you&apos;re on a Shepherd serve team. Your prayer team tag in Planning Center grants dashboard access.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen page-bg">
      <Nav />

      <main className="max-w-md mx-auto px-6 py-20">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  )
}
