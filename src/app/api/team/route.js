import { createServiceSupabaseClient } from '@/lib/supabase'
import { getTeamSession } from '@/lib/auth'

// Helper: gate an action behind admin role. Returns null if the request is
// allowed (caller proceeds), or a Response object to short-circuit with.
function requireAdmin(session) {
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })
  return null
}

// ─────────────────────────────────────────────────────────────────────
// GET — read actions
// ─────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const session = await getTeamSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const serviceClient = createServiceSupabaseClient()

  // ---- ADMIN ACTIONS ----

  if (action === 'all_members') {
    const denied = requireAdmin(session); if (denied) return denied

    const { data, error } = await serviceClient
      .from('team_members')
      .select('id, display_name, email, role, approved, planning_center_id, auth_user_id, created_at')
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ members: data })
  }

  if (action === 'stats') {
    const denied = requireAdmin(session); if (denied) return denied

    const { data: requests } = await serviceClient.from('prayer_requests').select('id, status')
    const { data: pickups } = await serviceClient.from('prayer_pickups').select('id')
    const { data: words } = await serviceClient.from('prophetic_words').select('id')
    const { data: members } = await serviceClient.from('team_members').select('id').eq('approved', true)

    return Response.json({
      stats: {
        total_requests: requests?.length || 0,
        pending_requests: requests?.filter(r => r.status === 'pending').length || 0,
        active_requests: requests?.filter(r => r.status === 'active').length || 0,
        total_pickups: pickups?.length || 0,
        total_prophetic_words: words?.length || 0,
        active_members: members?.length || 0,
      }
    })
  }

  // Admin-only: full requests list with submitter identity (breaks anonymity
  // intentionally, for admin pastoral-care visibility). Joins prayer_requests
  // → visitors and counts pickups per request.
  if (action === 'all_requests') {
    const denied = requireAdmin(session); if (denied) return denied

    const { data: requests, error } = await serviceClient
      .from('prayer_requests')
      .select(`
        id, category, title, description, status,
        outcome_note, outcome_at, created_at, visitor_id,
        visitor:visitors ( id, display_name, email )
      `)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Count pickups per request in one query.
    const { data: pickups } = await serviceClient
      .from('prayer_pickups')
      .select('prayer_request_id')

    const pickupCounts = new Map()
    for (const p of pickups || []) {
      pickupCounts.set(p.prayer_request_id, (pickupCounts.get(p.prayer_request_id) || 0) + 1)
    }

    return Response.json({
      requests: (requests || []).map(r => ({
        ...r,
        submitter_name: r.visitor?.display_name || null,
        submitter_email: r.visitor?.email || null,
        pickup_count: pickupCounts.get(r.id) || 0,
      })),
    })
  }

  // Admin-only: drill into a single team member's activity.
  if (action === 'member_activity') {
    const denied = requireAdmin(session); if (denied) return denied
    const memberId = searchParams.get('member_id')
    if (!memberId) return Response.json({ error: 'member_id required' }, { status: 400 })

    const [memberRes, pickupsRes, wordsRes] = await Promise.all([
      serviceClient
        .from('team_members')
        .select('id, display_name, email, role, approved, planning_center_id, auth_user_id, created_at')
        .eq('id', memberId)
        .maybeSingle(),
      serviceClient
        .from('prayer_pickups')
        .select(`
          id, created_at, prayer_request_id,
          request:prayer_requests ( id, category, title, status )
        `)
        .eq('team_member_id', memberId)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('prophetic_words')
        .select(`
          id, content, created_at, prayer_request_id,
          request:prayer_requests ( id, title )
        `)
        .eq('team_member_id', memberId)
        .order('created_at', { ascending: false }),
    ])

    if (memberRes.error) return Response.json({ error: memberRes.error.message }, { status: 500 })
    if (!memberRes.data) return Response.json({ error: 'Member not found' }, { status: 404 })

    const pickups = pickupsRes.data || []
    const words = wordsRes.data || []
    const lastActiveAt = [
      ...(pickups[0]?.created_at ? [pickups[0].created_at] : []),
      ...(words[0]?.created_at ? [words[0].created_at] : []),
    ].sort().reverse()[0] || null

    return Response.json({
      member: memberRes.data,
      pickups,
      prophetic_words: words,
      stats: {
        total_pickups: pickups.length,
        total_prophetic_words: words.length,
        last_active_at: lastActiveAt,
      },
    })
  }

  // ---- DEFAULT: my pickups ----
  const { data: myPickups, error } = await serviceClient
    .from('prayer_pickups')
    .select('id, prayer_request_id, created_at')
    .eq('team_member_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ pickups: myPickups })
}


// ─────────────────────────────────────────────────────────────────────
// POST — admin: add a team member by email
// ─────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const session = await getTeamSession()
  const denied = requireAdmin(session); if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const { action } = body

  if (action === 'add_member') {
    const email = (body.email || '').trim().toLowerCase()
    const display_name = (body.display_name || '').trim()
    const role = body.role === 'admin' ? 'admin' : 'member'

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email is required.' }, { status: 400 })
    }
    if (!display_name) {
      return Response.json({ error: 'Display name is required.' }, { status: 400 })
    }

    const serviceClient = createServiceSupabaseClient()

    // Reject duplicates up-front to surface a friendly error (instead of a
    // raw unique-constraint violation from Postgres).
    const { data: existing } = await serviceClient
      .from('team_members')
      .select('id, approved')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return Response.json({
        error: existing.approved
          ? 'This email is already on the prayer team.'
          : 'This email is already in the team list but suspended. Use Activate instead.',
      }, { status: 409 })
    }

    // auth_user_id stays null until they sign in via magic link; getTeamSession
    // links it on first sign-in by matching email.
    const { data, error } = await serviceClient
      .from('team_members')
      .insert({ email, display_name, role, approved: true, auth_user_id: null })
      .select('id, display_name, email, role, approved, auth_user_id, created_at')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ member: data })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}


// ─────────────────────────────────────────────────────────────────────
// PATCH — admin: update a team member (role, approved status)
// ─────────────────────────────────────────────────────────────────────
export async function PATCH(request) {
  const session = await getTeamSession()
  const denied = requireAdmin(session); if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const { id } = body
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  // Whitelist what the admin can change. (No editing email, auth_user_id, etc.)
  const updates = {}
  if (body.role === 'admin' || body.role === 'member') updates.role = body.role
  if (typeof body.approved === 'boolean') updates.approved = body.approved
  if (typeof body.display_name === 'string' && body.display_name.trim()) {
    updates.display_name = body.display_name.trim()
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  // Safety: prevent an admin from demoting themselves to non-admin if they're
  // the only admin. Keeps the church from accidentally locking everyone out.
  if (updates.role === 'member' || updates.approved === false) {
    if (id === session.id) {
      const serviceClient = createServiceSupabaseClient()
      const { count } = await serviceClient
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('approved', true)
      if ((count ?? 0) <= 1) {
        return Response.json({
          error: 'You are the only admin — promote someone else first.',
        }, { status: 400 })
      }
    }
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select('id, display_name, email, role, approved, auth_user_id, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ member: data })
}
