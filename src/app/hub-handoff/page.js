'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Bridge page: hub → Prayer Wall session handoff.
// Hub builds URLs like:
//   https://shepherd-prayer-wall.netlify.app/hub-handoff?next=submit#access_token=...&refresh_token=...
// We read the hash tokens, call setSession() (writes @supabase/ssr's auth cookies),
// then redirect to /submit or /team.

function HandoffInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    const run = async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (!access_token || !refresh_token) {
          setStatus('No session in handoff URL. Please sign in.')
          setTimeout(() => router.replace('/login'), 1500)
          return
        }

        const supabase = createBrowserSupabaseClient()
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) {
          setStatus(`Sign-in failed: ${error.message}`)
          return
        }

        const next = searchParams.get('next') || 'submit'
        const destPath = next === 'team' ? '/team' : '/submit'

        // For team destination, also establish the legacy team_session cookie
        // so that /team's getTeamSession() check passes (regardless of whether
        // the lib/auth.js update was picked up by the Netlify build cache).
        if (next === 'team') {
          try {
            await fetch('/api/auth/establish-team-session', {
              method: 'POST',
              credentials: 'include',
            })
          } catch (e) {
            // Non-fatal — if this fails, the page will show "Team Access Required" and the user can retry.
            console.warn('establish-team-session failed:', e)
          }
        }

        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', destPath)
        }
        router.replace(destPath)
      } catch (err) {
        setStatus(`Unexpected error: ${err?.message || err}`)
      }
    }
    run()
  }, [router, searchParams])

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 32, height: 32, margin: '0 auto 16px',
        border: '2px solid #333842', borderTopColor: '#718e82',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#9aa0a8' }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function HubHandoffPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1c1f26',
      color: '#ededed',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <Suspense fallback={<p style={{ color: '#9aa0a8' }}>Loading…</p>}>
        <HandoffInner />
      </Suspense>
    </div>
  )
}
