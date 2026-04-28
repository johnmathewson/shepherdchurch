import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from './supabase'

// Get the authenticated visitor — checks Supabase Auth first, then PC visitor session
export async function getVisitorSession() {
  // 1. Check Supabase Auth (email/password users)
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!error && user) {
    const serviceClient = createServiceSupabaseClient()
    const { data: visitor } = await serviceClient
      .from('visitors')
      .select('id, display_name, email, email_notifications')
      .eq('auth_user_id', user.id)
      .single()

    if (visitor) return { ...visitor, authUserId: user.id, authMethod: 'email' }
  }

  // 2. Check PC visitor session cookie (Planning Center OAuth visitors)
  const pcToken = cookieStore.get('pc_visitor_session')?.value
  if (pcToken) {
    try {
      const payload = await verifySessionToken(pcToken)
      if (payload.role === 'visitor') {
        return {
          id: payload.id,
          display_name: payload.display_name,
          email: payload.email,
          email_notifications: true,
          authMethod: 'planning_center',
          planningCenterId: payload.planning_center_id,
        }
      }
    } catch {
      // Invalid or expired token — fall through
    }
  }

  return null
}

// Get the team member session.
// Two paths are accepted:
//   1. Legacy: signed `team_session` JWT cookie (set by /team/login PCO flow).
//   2. Hub flow: Supabase Auth user + approved row in `team_members`. This is
//      what fires when a Shepherd member with the Prayer Wall tag clicks the
//      Prayer Team Dashboard card on the hub — they arrive with a Supabase
//      session (set by /hub-handoff) but no team_session cookie.
export async function getTeamSession() {
  const _GET_TEAM_SESSION_VERSION = 'v3-supabase-fallback-2026-04-27'
  const cookieStore = await cookies()
  const token = cookieStore.get('team_session')?.value
  if (token) {
    try {
      const payload = await verifySessionToken(token)
      return payload
    } catch {
      // Invalid/expired — fall through to Supabase Auth check.
    }
  }

  // Fallback: Supabase-authenticated user with an approved team_members row.
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const serviceClient = createServiceSupabaseClient()
  const { data: tm } = await serviceClient
    .from('team_members')
    .select('id, display_name, email, role, approved, planning_center_id')
    .eq('auth_user_id', user.id)
    .eq('approved', true)
    .maybeSingle()

  if (!tm) return null
  return {
    id: tm.id,
    display_name: tm.display_name,
    email: tm.email,
    role: tm.role,
    approved: tm.approved,
    planning_center_id: tm.planning_center_id,
    authMethod: 'supabase',
    authUserId: user.id,
  }
}

// Create a signed session token (shared by team and PC visitor sessions)
export async function createSessionToken(payload) {
  const secret = process.env.PLANNING_CENTER_CLIENT_SECRET
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const sig = Buffer.from(signature).toString('base64url')
  const encoded = Buffer.from(data).toString('base64url')
  return `${encoded}.${sig}`
}

// Verify a signed session token
export async function verifySessionToken(token) {
  const secret = process.env.PLANNING_CENTER_CLIENT_SECRET
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) throw new Error('Invalid token format')

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
  if (!valid) throw new Error('Invalid signature')

  const payload = JSON.parse(data)
  if (payload.exp < Date.now()) throw new Error('Token expired')
  return payload
}

// Backward-compatible aliases
export const createTeamSessionToken = createSessionToken
export const verifyTeamSessionToken = verifySessionToken
