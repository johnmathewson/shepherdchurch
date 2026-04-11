'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import ErrorAlert from '@/components/ErrorAlert'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        <Link href="/signup" className="text-sage hover:text-sage-light text-sm font-medium">Create Account</Link>
      </Nav>

      <main className="max-w-md mx-auto px-6 py-20">
        <div className="animate-fade-in glass rounded-lg p-8">
          <h1 className="font-heading text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-text-secondary mb-8">Sign in to view your prayer requests and updates.</p>

          <ErrorAlert message={error} />

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
              className="w-full py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-text-muted text-sm text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-sage hover:text-sage-light">Sign up here</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
