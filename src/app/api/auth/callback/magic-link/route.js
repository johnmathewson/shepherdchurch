import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

// Supabase magic-link callback.
//
// Flow:
//   1. User submits email on /login → /api/auth POST { action: 'visitor_magic_link' }
//   2. Supabase emails them a link that lands here with ?code=...
//   3. We exchange the code for a session (sets the auth cookie),
//      ensure a `visitors` row exists, then redirect to ?next or /dashboard.
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const errorParam = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const explicitNext = url.searchParams.get('next')
  const rawNext = explicitNext || '/dashboard'
  // Only accept same-origin paths. Reject protocol-relative URLs ("//evil.com")
  // which start with "/" but resolve off-origin → open redirect risk.
  const isSafePath = rawNext.startsWith('/')
    && !rawNext.startsWith('//')
    && !rawNext.startsWith('/\\')
  const next = isSafePath ? rawNext : '/dashboard'

  if (errorParam) {
    const detail = encodeURIComponent(errorDescription || errorParam)
    return Response.redirect(new URL(`/login?error=oauth_denied&detail=${detail}`, request.url))
  }

  if (!code) {
    return Response.redirect(new URL('/login?error=no_code', request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data?.user) {
    const detail = encodeURIComponent(exchangeError?.message || 'no user')
    return Response.redirect(new URL(`/login?error=token_exchange&detail=${detail}`, request.url))
  }

  // First-time sign-ins won't have a visitors row yet — create one so the rest
  // of the app (dashboard, prayer submission) has something to read against.
  try {
    const serviceClient = createServiceSupabaseClient()
    const { data: existing } = await serviceClient
      .from('visitors')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle()

    if (!existing) {
      const fallbackName = (data.user.email || '').split('@')[0] || 'Friend'
      const { error: profileError } = await serviceClient.rpc('create_visitor_profile', {
        p_auth_user_id: data.user.id,
        p_email: data.user.email,
        p_display_name: fallbackName,
      })
      if (profileError) {
        console.error('Magic-link visitor profile creation failed:', profileError)
        return Response.redirect(new URL('/login?error=server_error', request.url))
      }
    }
  } catch (err) {
    console.error('Magic-link callback unexpected error:', err)
    return Response.redirect(new URL('/login?error=unexpected', request.url))
  }

  // Smart routing: if the user is on the prayer team, route them into
  // the team UI instead of the visitor dashboard. Only applies when no
  // explicit ?next was supplied (or it was the default /dashboard) —
  // an explicit destination always wins.
  const shouldAutoRouteTeam = !explicitNext || explicitNext === '/dashboard'
  if (shouldAutoRouteTeam) {
    try {
      const sc = createServiceSupabaseClient()
      // Path 1 — team_members row already linked to this auth user
      let { data: tm } = await sc
        .from('team_members')
        .select('id, role, auth_user_id')
        .eq('auth_user_id', data.user.id)
        .eq('approved', true)
        .maybeSingle()

      // Path 2 — admin-added by email, not yet linked. Link now so
      // getTeamSession's first-time-link path doesn't have to.
      if (!tm && data.user.email) {
        const { data: byEmail } = await sc
          .from('team_members')
          .select('id, role, auth_user_id')
          .eq('email', data.user.email)
          .eq('approved', true)
          .maybeSingle()
        if (byEmail) {
          if (!byEmail.auth_user_id) {
            await sc
              .from('team_members')
              .update({ auth_user_id: data.user.id })
              .eq('id', byEmail.id)
          }
          tm = byEmail
        }
      }

      if (tm) {
        const teamDest = tm.role === 'admin' ? '/team/admin' : '/team'
        return Response.redirect(new URL(teamDest, request.url))
      }
    } catch (err) {
      // Don't block sign-in on a routing-lookup failure — fall through to
      // the default /dashboard redirect below.
      console.error('Team-routing lookup failed:', err)
    }
  }

  return Response.redirect(new URL(next, request.url))
}
