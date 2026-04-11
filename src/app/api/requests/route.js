import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession, getTeamSession } from '@/lib/auth'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  const serviceClient = createServiceSupabaseClient()

  if (mode === 'team') {
    const session = await getTeamSession()
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
