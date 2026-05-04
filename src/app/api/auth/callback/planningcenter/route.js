// DEPRECATED — this Next.js Planning Center OAuth callback is being replaced
// by the unified `pco-signin` Supabase Edge Function (single source of truth
// for PCO sign-ins across apps hub, identity tool, and prayer wall).
//
// As of the PC-OAuth-collapse work:
//   • /team/login now points its OAuth redirect_uri at the edge function.
//   • /login's small "Sign in with Planning Center" link still points here
//     (kept for now, will be migrated in a follow-up).
//   • This route handler stays in place so any in-flight tokens or the /login
//     path continue to work — do NOT delete until /login is also migrated.
//
// Once /login is migrated and we've confirmed no traffic hits this route for
// a few days, this whole file can be removed.

import { cookies } from 'next/headers'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'

const PC_TOKEN_URL = 'https://api.planningcenteronline.com/oauth/token'
const PC_PEOPLE_URL = 'https://api.planningcenteronline.com/people/v2'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  // state format: "visitor" | "visitor:/some/path" | "team"
  // The colon-separated suffix is the post-login destination for visitor flows.
  const rawState = searchParams.get('state') || 'visitor'
  const colonIdx = rawState.indexOf(':')
  const origin = colonIdx === -1 ? rawState : rawState.slice(0, colonIdx)
  const encodedNext = colonIdx === -1 ? '' : rawState.slice(colonIdx + 1)
  const visitorSuccessRedirect = (() => {
    if (!encodedNext) return '/dashboard'
    const decoded = decodeURIComponent(encodedNext)
    // Only allow same-origin paths; reject protocol-relative tricks
    return decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/\\')
      ? decoded
      : '/dashboard'
  })()
  const errorRedirect = origin === 'team' ? '/team/login' : '/login'

  if (errorParam) {
    return Response.redirect(new URL(`${errorRedirect}?error=oauth_denied`, request.url))
  }

  if (!code) {
    return Response.redirect(new URL(`${errorRedirect}?error=no_code`, request.url))
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch(PC_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.PLANNING_CENTER_CLIENT_ID,
        client_secret: process.env.PLANNING_CENTER_CLIENT_SECRET,
        redirect_uri: process.env.PLANNING_CENTER_REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      return Response.redirect(new URL(`${errorRedirect}?error=token_exchange`, request.url))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Step 2: Fetch the authenticated user's profile
    const meRes = await fetch(`${PC_PEOPLE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!meRes.ok) {
      return Response.redirect(new URL(`${errorRedirect}?error=profile_fetch`, request.url))
    }

    const meData = await meRes.json()
    const person = meData.data
    const pcId = person.id
    const firstName = person.attributes.first_name || ''
    const lastName = person.attributes.last_name || ''
    const displayName = `${firstName} ${lastName}`.trim()

    // Get email from the person's primary email
    const emailsRes = await fetch(`${PC_PEOPLE_URL}/people/${pcId}/emails`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const emailsData = await emailsRes.json()
    const primaryEmail = emailsData.data?.find(e => e.attributes.primary)?.attributes.address
      || emailsData.data?.[0]?.attributes.address
      || ''

    // Step 3: Check for prayer team tag
    const prayerTagId = process.env.PLANNING_CENTER_PRAYER_TAG_ID
    let hasTeamTag = false

    // Check Services API for Prayer Wall position assignment (ID: 38505912)
    const PC_SERVICES_URL = 'https://api.planningcenteronline.com/services/v2'
    const positionsRes = await fetch(
      `${PC_SERVICES_URL}/people/${pcId}/person_team_position_assignments?include=team_position&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (positionsRes.ok) {
      const positionsData = await positionsRes.json()
      hasTeamTag = (positionsData.included || [])
        .some(i => i.type === 'TeamPosition' && i.id === prayerTagId)
    }

    const serviceClient = createServiceSupabaseClient()
    const cookieStore = await cookies()

    if (hasTeamTag) {
      // ---- TEAM MEMBER FLOW ----
      const { data: member, error: upsertError } = await serviceClient.rpc('upsert_team_member_from_pc', {
        p_planning_center_id: pcId,
        p_email: primaryEmail,
        p_display_name: displayName,
      })

      if (upsertError) {
        console.error('Team member upsert error:', upsertError)
        return Response.redirect(new URL('/team/login?error=server_error', request.url))
      }

      const sessionToken = await createSessionToken({
        id: member.id,
        display_name: member.display_name,
        role: member.role || 'member',
        planning_center_id: pcId,
      })

      cookieStore.set('team_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
        sameSite: 'lax',
      })

      return Response.redirect(new URL('/team', request.url))
    } else {
      // ---- VISITOR FLOW (church member without prayer team tag) ----
      const { data: visitor, error: visitorError } = await serviceClient.rpc('upsert_visitor_from_pc', {
        p_planning_center_id: pcId,
        p_email: primaryEmail,
        p_display_name: displayName,
      })

      if (visitorError) {
        console.error('Visitor upsert error:', visitorError)
        return Response.redirect(new URL(`${errorRedirect}?error=server_error`, request.url))
      }

      const sessionToken = await createSessionToken({
        id: visitor.id,
        display_name: visitor.display_name,
        email: visitor.email || primaryEmail,
        role: 'visitor',
        planning_center_id: pcId,
      })

      cookieStore.set('pc_visitor_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
        sameSite: 'lax',
      })

      return Response.redirect(new URL(visitorSuccessRedirect, request.url))
    }
  } catch (err) {
    console.error('Planning Center OAuth error:', err)
    return Response.redirect(new URL(`${errorRedirect}?error=unexpected`, request.url))
  }
}
