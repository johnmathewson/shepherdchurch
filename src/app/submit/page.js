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
  // 0: checking auth, 1: category, 2: details, 3: confirmation
  // Anyone not authenticated is bounced to /login?next=/submit (no in-page auth).
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkAuth() {
      // Check Supabase Auth first (covers magic-link visitors)
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (user) {
        setStep(1)
        return
      }
      // Fall back to PC visitor session (httpOnly cookie — server check)
      try {
        const res = await fetch('/api/auth/check')
        if (cancelled) return
        if (res.ok) {
          setStep(1)
          return
        }
      } catch {
        // fall through
      }
      // Not authenticated — send them to /login and bring them back here.
      if (!cancelled) router.replace('/login?next=/submit')
    }

    checkAuth()
    return () => { cancelled = true }
  }, [router])

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
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen page-bg">
      <Nav>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm">My Dashboard</Link>
      </Nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress bar — visible during the active steps (1 and 2) */}
        {step > 0 && step < 3 && (
          <div className="flex items-center gap-2 mb-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-all ${step >= i + 1 ? 'bg-sage' : 'bg-border'}`} />
              </div>
            ))}
          </div>
        )}

        <ErrorAlert message={error} />

        {/* Step 0: Loading / redirecting to /login */}
        {step === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold mb-2">What area needs prayer?</h1>
            <p className="text-text-secondary mb-8">Select the category that best fits your prayer request.</p>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setStep(2) }}
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

        {/* Step 2: Details */}
        {step === 2 && (
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
                  onClick={() => setStep(1)}
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

        {/* Step 3: Confirmation */}
        {step === 3 && (
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
                onClick={() => { setStep(1); setTitle(''); setDescription(''); setCategory(''); setError('') }}
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
