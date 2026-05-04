import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession, getTeamSession } from '@/lib/auth'

// Inline fallback in case the lib/auth.js getTeamSession() update isn't picked up by the
// Netlify build cache. Tries the imported getTeamSession first; if it returns null,
// runs the same Supabase Auth + team_members lookup directly here.
async function resolveTeamSession() {
  const session = await getTeamSession()
  if (session) return session
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sc = createServiceSupabaseClient()

  // Path 1 — already linked
  let { data: tm } = await sc
    .from('team_members')
    .select('id, display_name, email, role, approved, planning_center_id')
    .eq('auth_user_id', user.id)
    .eq('approved', true)
    .maybeSingle()

  // Path 2 — admin-added by email, link on first sign-in
  if (!tm && user.email) {
    const { data: byEmail } = await sc
      .from('team_members')
      .select('id, display_name, email, role, approved, planning_center_id, auth_user_id')
      .eq('email', user.email)
      .eq('approved', true)
      .maybeSingle()
    if (byEmail) {
      if (!byEmail.auth_user_id) {
        await sc.from('team_members').update({ auth_user_id: user.id }).eq('id', byEmail.id)
      }
      tm = byEmail
    }
  }

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

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  const serviceClient = createServiceSupabaseClient()

  if (mode === 'team') {
    const session = await resolveTeamSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Team sees anonymous requests via the view
    const { data, error } = await serviceClient
      .from('anonymous_prayer_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Get pickups for this team member
    const { data: myPickups } = await serviceClient
      .from('prayer_pickups')
      .select('prayer_request_id')
      .eq('team_member_id', session.id)

    const pickedUpIds = new Set((myPickups || []).map(p => p.prayer_request_id))

    return Response.json({
      requests: (data || []).map(r => ({
        ...r,
        picked_up_by_me: pickedUpIds.has(r.id),
      })),
    })
  }

  // Visitor mode — uses Supabase Auth
  const session = await getVisitorSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await serviceClient
    .from('prayer_requests')
    .select('*')
    .eq('visitor_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ requests: data })
}

export async function POST(request) {
  const session = await getVisitorSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, title, description } = await request.json()

  if (!category || !title || !description) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('prayer_requests')
    .insert({
      visitor_id: session.id,
      category,
      title,
      description,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, request: data })
}
