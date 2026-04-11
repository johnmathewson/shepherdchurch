'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import ErrorAlert from '@/components/ErrorAlert'
import { createBrowserSupabaseClient } from '@/lib/supabase'

const categories = [
  { value: 'spiritual', label: 'Spiritual', color: 'border-spiritual text-spiritual bg-spiritual/10', description: 'Faith, direction, growth, spiritual warfare' },
  { value: 'emotional', label: 'Emotional', color: 'border-emotional text-emotional bg-emotional/10', description: 'Anxiety, grief, relationships, peace' },
  { value: 'physical', label: 'Physical', color: 'border-physical text-physical bg-physical/10', description: 'Healing, health, strength, recovery' },
  { value: 'other', label: 'Other', color: 'border-other text-other bg-other/10', description: 'Finances, work, family, guidance' },
]

export default function SubmitPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0: checking auth, 1: auth, 2: category, 3: details, 4: confirmation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignup, setIsSignup] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createBrowserSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    setStep(user ? 2 : 1)
  }

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const action = isSignup ? 'visitor_signup' : 'visitor_login'
      const body = isSignup
        ? { action, email, password, display_name: name }
        : { action, email, password }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = step <= 1 ? 4 : 3
  const currentProgress = step <= 1 ? step : step - 1

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm">My Dashboard</Link>
      </Nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress bar */}
        {step > 0 && step < 4 && (
          <div className="flex items-center gap-2 mb-10">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-all ${currentProgress >= i + 1 ? 'bg-sage' : 'bg-border'}`} />
              </div>
            ))}
          </div>
        )}

        <ErrorAlert message={error} />

        {/* Step 0: Loading */}
        {step === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Step 1: Auth */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold mb-2">
              {isSignup ? 'Create an Account' : 'Welcome Back'}
            </h1>
            <p className="text-text-secondary mb-8">
              {isSignup
                ? 'Sign up to submit your prayer request. Your identity stays private from the prayer team.'
                : 'Sign in to continue submitting a prayer request.'}
            </p>
            <form onSubmit={handleAuth} className="space-y-5">
              {isSignup && (
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
              )}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                {isSignup && (
                  <p className="mt-1.5 text-xs text-text-muted">Used for notifications when someone prays for you</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
                  required
                  minLength={isSignup ? 6 : undefined}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : 'Continue'}
              </button>
            </form>
            <p className="mt-6 text-text-muted text-sm text-center">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button onClick={() => { setIsSignup(!isSignup); setError('') }} className="text-sage hover:text-sage-light">
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold mb-2">What area needs prayer?</h1>
            <p className="text-text-secondary mb-8">Select the category that best fits your prayer request.</p>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setStep(3) }}
                  className={`${cat.color} border-2 rounded-lg p-5 text-left hover:scale-[1.02] transition-all backdrop-blur-sm ${
                    category === cat.value ? 'ring-2 ring-sage' : ''
                  }`}
                >
                  <div className="font-heading font-semibold text-lg mb-1">{cat.label}</div>
                  <div className="text-sm opacity-80">{cat.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold mb-2">Share Your Request</h1>
            <p className="text-text-secondary mb-8">
              Give your request a short title and describe what you need prayer for.
              Take your time — our team reads each one carefully.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Prayer Request Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Healing for my mother"
                  required
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Describe Your Request</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share as much or as little as you'd like..."
                  required
                  rows={6}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3.5 border border-border text-text-secondary hover:border-sage font-heading font-semibold rounded-lg transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Prayer Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="animate-fade-in text-center py-12">
            <div className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
              <svg className="w-10 h-10 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-heading text-3xl font-bold mb-3">Prayer Request Submitted</h1>
            <p className="text-text-secondary text-lg mb-8 max-w-md mx-auto">
              Your request has been received. Our prayer team will be notified and
              you&apos;ll hear from us when someone picks up your request.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-3.5 bg-sage hover:bg-sage-dark text-white font-heading font-semibold rounded-lg transition-all"
              >
                View My Dashboard
              </Link>
              <button
                onClick={() => { setStep(2); setTitle(''); setDescription(''); setCategory(''); setError('') }}
                className="px-8 py-3.5 border border-border hover:border-sage text-text-secondary hover:text-text-primary font-heading font-semibold rounded-lg transition-all"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
