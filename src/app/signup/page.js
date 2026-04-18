'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import ErrorAlert from '@/components/ErrorAlert'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pcAuthUrl = `https://api.planningcenteronline.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_PLANNING_CENTER_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_PLANNING_CENTER_REDIRECT_URI || '')}&response_type=code&scope=people&state=visitor`

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visitor_signup', email, password, display_name: name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/login" className="text-text-secondary hover:text-text-primary text-sm">Already have an account? Sign In</Link>
      </Nav>

      <main className="max-w-md mx-auto px-6 py-20">
        <div className="animate-fade-in glass rounded-lg p-8">
          <h1 className="font-heading text-3xl font-bold mb-2">Get Started</h1>
          <p className="text-text-secondary mb-6">
            Sign up to submit prayer requests and receive updates from our prayer team.
          </p>

          {/* Anonymity notice */}
          <div className="mb-8 rounded-lg border border-gold/30 bg-gold/5 p-4 flex gap-3">
            <svg className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-text-primary block mb-1">Your identity stays private.</strong>
              Prayer requests you submit are shown to the prayer team <strong>anonymously</strong> — they see the category, title, and description only. Your name, email, and any identifying information are never shared with the prayer team.
            </div>
          </div>

          <ErrorAlert message={error} />

          {/* Church Center OAuth */}
          <a
            href={pcAuthUrl}
            className="flex items-center justify-center gap-3 w-full py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all shadow-lg shadow-sage/20 mb-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            Sign in with Church Center
          </a>
          <p className="text-text-muted text-xs text-center mb-6">
            Shepherd Church members can sign in instantly with their Church Center account.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-xs uppercase tracking-wider">or create an account</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name or preferred name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <p className="mt-1.5 text-xs text-text-muted">Used for notifications when someone prays for you</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 border border-border hover:border-sage text-text-primary font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account with Email'}
            </button>
          </form>

          <p className="mt-6 text-text-muted text-sm text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-sage hover:text-sage-light">Sign in here</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
