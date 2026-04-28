import { cookies } from 'next/headers'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'

// Verifies a short-lived signed token minted by the Shepherd Apps Hub and
// exchanges it for a normal Prayer Wall visitor session. Signed with the
// shared PLANNING_CENTER_CLIENT_SECRET — see the hub's lib/handoff-token.js.
async function verifyHandoffToken(token) {
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) throw new Error('malformed_token')

  const secret = process.env.PLANNING_CENTER_CLIENT_SECRET
  if (!secret) throw new Error('server_misconfigured')

  const data = Buffer.from(encoded, 'base64url').toString()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const signatureBytes = Buffer.from(sig, 'base64url')
  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data))
  if (!valid) throw new Error('invalid_signature')

  const payload = JSON.parse(data)
  if (!payload.exp || payload.exp < Date.now()) throw new Error('token_expired')
  if (payload.scope !== 'prayer-wall-handoff') throw new Error('wrong_scope')
  return payload
}

function redirectWithDetail(requestUrl, errorCode, detail) {
  const params = new URLSearchParams({ error: errorCode })
  if (detail) params.set('detail', detail.substring(0, 400))
  return Response.redirect(new URL(`/login?${params.toString()}`, requestUrl))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return redirectWithDetail(request.url, 'no_token', null)
  }

  let payload
  try {
    payload = await verifyHandoffToken(token)
  } catch (err) {
    console.error('Hub handoff verification failed:', err?.message || err)
    return redirectWithDetail(request.url, 'invalid_token', String(err?.message || err))
  }

  const pcId = payload.planning_center_id
  const email = payload.email || ''
  const displayName = payload.display_name || ''

  if (!pcId) {
    return redirectWithDetail(request.url, 'invalid_token', 'missing planning_center_id in payload')
  }

  try {
    const serviceClient = createServiceSupabaseClient()
    const { data: visitor, error: visitorError } = await serviceClient.rpc('upsert_visitor_from_pc', {
      p_planning_center_id: pcId,
      p_email: email,
      p_display_name: displayName,
    })

    if (visitorError) {
      console.error('upsert_visitor_from_pc failed:', visitorError)
      return redirectWithDetail(request.url, 'server_error', `upsert: ${visitorError.message || JSON.stringify(visitorError)}`)
    }

    // Mint a standard Prayer Wall visitor session token and set the cookie.
    const sessionToken = await createSessionToken({
      id: visitor.id,
      display_name: visitor.display_name,
      email: visitor.email || email,
      role: 'visitor',
      planning_center_id: pcId,
    })

    const cookieStore = await cookies()
    cookieStore.set('pc_visitor_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
    })

    return Response.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('Hub handoff error:', err)
    return redirectWithDetail(request.url, 'server_error', String(err?.message || err))
  }
}
