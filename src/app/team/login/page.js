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

function TeamLoginContent() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const errorDetail = searchParams.get('detail')
  const friendlyError = errorCode ? errorMessages[errorCode] || 'An error occurred.' : ''
  const initialError = errorDetail && errorCode
    ? `${friendlyError} [${errorCode}] ${errorDetail}`
    : friendlyError

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(initialError)

  // PC is now a hidden-corner fallback for staff who aren't yet in team_members
  // (e.g., a brand-new Prayer Wall position assignee who hasn't been added by
  // an admin via email yet). Routes through the unified pco-signin edge
  // function with state=team so they land on /team after PC OAuth.
  const PCO_EDGE_REDIRECT = 'https://epkuvykamufrrgbacbel.supabase.co/functions/v1/pco-signin'
  const pcAuthUrl = `https://api.planningcenteronline.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_PLANNING_CENTER_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(PCO_EDGE_REDIRECT)}&response_type=code&scope=people+services&state=team`

  async function handleSendLink(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visitor_magic_link', email, next: '/team' }),
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
      {/* Team-themed mark — kept small and soft so the page reads as "sign in",
          not "this is special team-only territory" */}
      <div className="w-12 h-12 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center mx-auto mb-5">
        <svg className="w-6 h-6 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>

      <h1 className="font-heading text-2xl font-bold mb-2 text-center">Prayer Team Sign In</h1>
      <p className="text-text-secondary mb-8 text-center text-sm max-w-sm mx-auto">
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

      {/* Visitor escape hatch */}
      <p className="mt-8 text-text-muted text-xs text-center">
        Looking to submit a prayer request?{' '}
        <Link href="/login" className="text-sage hover:text-sage-light">Sign in here</Link>
      </p>

      {/* PC fallback — intentionally tiny, single line, low contrast.
          Only shown so a brand-new Prayer Wall position assignee can self-
          onboard via PC tag if an admin hasn't added them yet. Most users
          will never click this and that's the goal. */}
      <p className="mt-5 pt-4 border-t border-border/40 text-center text-text-muted/70 text-[10.5px] leading-relaxed">
        Not in our system yet?{' '}
        <a
          href={pcAuthUrl}
          className="text-text-muted hover:text-text-secondary underline-offset-2 hover:underline whitespace-nowrap"
        >
          Sign in with Planning Center
        </a>
      </p>
    </div>
  )
}

export default function TeamLoginPage() {
  return (
    <div className="min-h-screen page-bg">
      <Nav variant="team" />
      <main className="max-w-md mx-auto px-6 py-20">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <TeamLoginContent />
        </Suspense>
      </main>
    </div>
  )
}
