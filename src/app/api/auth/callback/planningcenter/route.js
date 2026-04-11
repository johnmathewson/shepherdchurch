import { cookies } from 'next/headers'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { createTeamSessionToken } from '@/lib/auth'

const PC_TOKEN_URL = 'https://api.planningcenteronline.com/oauth/token'
const PC_PEOPLE_URL = 'https://api.planningcenteronline.com/people/v2'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return Response.redirect(new URL('/team/login?error=oauth_denied', request.url))
  }

  if (!code) {
    return Response.redirect(new URL('/team/login?error=no_code', request.url))
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
      return Response.redirect(new URL('/team/login?error=token_exchange', request.url))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Step 2: Fetch the authenticated user's profile
    const meRes = await fetch(`${PC_PEOPLE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!meRes.ok) {
      return Response.redirect(new URL('/team/login?error=profile_fetch', request.url))
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
    let hasTag = false

    if (prayerTagId) {
      const tagsRes = await fetch(`${PC_PEOPLE_URL}/people/${pcId}/tags`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json()
        hasTag = tagsData.data?.some(tag => tag.id === prayerTagId)
      }
    } else {
      // If no tag ID is configured, allow all authenticated PC users
      hasTag = true
    }

    if (!hasTag) {
      return Response.redirect(new URL('/team/login?error=not_authorized', request.url))
    }

    // Step 4: Upsert team member in database
    const serviceClient = createServiceSupabaseClient()
    const { data: member, error: upsertError } = await serviceClient.rpc('upsert_team_member_from_pc', {
      p_planning_center_id: pcId,
      p_email: primaryEmail,
      p_display_name: displayName,
    })

    if (upsertError) {
      console.error('Team member upsert error:', upsertError)
      return Response.redirect(new URL('/team/login?error=server_error', request.url))
    }

    // Step 5: Create signed session token and set cookie
    const sessionToken = await createTeamSessionToken({
      id: member.id,
      display_name: member.display_name,
      role: member.role,
      planning_center_id: pcId,
    })

    const cookieStore = await cookies()
    cookieStore.set('team_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax',
    })

    // Redirect to team dashboard
    return Response.redirect(new URL('/team', request.url))
  } catch (err) {
    console.error('Planning Center OAuth error:', err)
    return Response.redirect(new URL('/team/login?error=unexpected', request.url))
  }
}
