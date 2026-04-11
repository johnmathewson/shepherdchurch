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
          <h1 className="font-heading text-3xl font-bold mb-2">Create an Account</h1>
          <p className="text-text-secondary mb-8">
            Sign up to submit prayer requests and receive updates from our prayer team.
          </p>

          <ErrorAlert message={error} />

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
              className="w-full py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
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
