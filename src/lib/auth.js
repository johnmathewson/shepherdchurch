import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from './supabase'

// Get the authenticated visitor from Supabase Auth
export async function getVisitorSession() {
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Look up the visitor profile
  const serviceClient = createServiceSupabaseClient()
  const { data: visitor } = await serviceClient
    .from('visitors')
    .select('id, display_name, email, email_notifications')
    .eq('auth_user_id', user.id)
    .single()

  if (!visitor) return null
  return { ...visitor, authUserId: user.id }
}

// Get the team member session from the signed JWT cookie
export async function getTeamSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('team_session')?.value
  if (!token) return null

  try {
    const payload = await verifyTeamSessionToken(token)
    return payload
  } catch {
    return null
  }
}

// Create a signed team session token (simple base64-encoded JSON with HMAC)
export async function createTeamSessionToken(payload) {
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

// Verify a team session token
export async function verifyTeamSessionToken(token) {
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
