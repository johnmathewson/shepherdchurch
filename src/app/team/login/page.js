'use client'

import { useSearchParams } from 'next/navigation'
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
}

function TeamLoginContent() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const errorMessage = errorCode ? errorMessages[errorCode] || 'An error occurred.' : ''

  const pcAuthUrl = `https://api.planningcenteronline.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_PLANNING_CENTER_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_PLANNING_CENTER_REDIRECT_URI || '')}&response_type=code&scope=people&state=team`

  return (
    <div className="animate-fade-in glass rounded-lg p-8">
      <div className="w-16 h-16 rounded-full bg-purple/20 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h1 className="font-heading text-3xl font-bold mb-2 text-center">Prayer Team Dashboard</h1>
      <p className="text-text-secondary mb-8 text-center max-w-sm mx-auto">
        Sign in with your Planning Center account to access the prayer team dashboard.
      </p>

      <ErrorAlert message={errorMessage} />

      <a
        href={pcAuthUrl}
        className="flex items-center justify-center gap-3 w-full py-3.5 bg-purple hover:bg-purple-light text-white font-heading font-semibold rounded-lg transition-all shadow-lg shadow-purple/20"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Sign in with Planning Center
      </a>

      <p className="mt-8 text-text-muted text-xs text-center max-w-sm mx-auto">
        Prayer Team members are identified by their tag in Planning Center.
        If you&apos;re a church member looking to submit a prayer request,{' '}
        <a href="/login" className="text-sage hover:text-sage-light">sign in here instead</a>.
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
