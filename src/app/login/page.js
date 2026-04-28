'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Nav from '@/components/Nav'
import ErrorAlert from '@/components/ErrorAlert'

const errorMessages = {
  oauth_denied: 'Authorization was denied. Please try again.',
  no_code: 'No authorization code received. Please try again.',
  token_exchange: 'Failed to complete sign-in. Please try again.',
  profile_fetch: 'Could not retrieve your profile. Please try again.',
  server_error: 'Something went wrong on our end. Please try again.',
  unexpected: 'An unexpected error occurred. Please try again.',
  no_token: 'Sign-in handoff was incomplete. Please try again.',
  invalid_token: 'Sign-in handoff could not be verified. Please try again.',
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const errorDetail = searchParams.get('detail')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const friendlyError = errorCode ? errorMessages[errorCode] || 'An error occurred.' : ''
  const [error, setError] = useState(errorDetail ? `${friendlyError} [${errorCode}] ${errorDetail}` : friendlyError)

  const pcAuthUrl = `https://api.planningcenteronline.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_PLANNING_CENTER_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_PLANNING_CENTER_REDIRECT_URI || '')}&response_type=code&scope=people&state=visitor`

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visitor_login', email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const next = searchParams.get('next')
      router.push(next || '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in glass rounded-lg p-8">
      <h1 className="font-heading text-3xl font-bold mb-2">Welcome Back</h1>
      <p className="text-text-secondary mb-8">Sign in to view your prayer requests and updates.</p>

      <ErrorAlert message={error} />

      {/* Church Center OAuth */}
      <a
        href={pcAuthUrl}
        className="flex items-center justify-center gap-3 w-full py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all shadow-lg shadow-sage/20 mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
        Sign in with Church Center
      </a>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-text-muted text-xs uppercase tracking-wider">or use email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 border border-border hover:border-sage text-text-primary font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In with Email'}
        </button>
      </form>

      <p className="mt-6 text-text-muted text-sm text-center">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-sage hover:text-sage-light">Sign up here</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/signup" className="text-sage hover:text-sage-light text-sm font-medium">Create Account</Link>
      </Nav>

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
