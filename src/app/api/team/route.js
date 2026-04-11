import { createServiceSupabaseClient } from '@/lib/supabase'
import { getTeamSession } from '@/lib/auth'

export async function GET(request) {
  const session = await getTeamSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const serviceClient = createServiceSupabaseClient()

  if (action === 'all_members') {
    if (session.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })

    const { data, error } = await serviceClient
      .from('team_members')
      .select('id, display_name, email, role, approved, planning_center_id, created_at')
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ members: data })
  }

  if (action === 'stats') {
    if (session.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })

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

  // Default: get my pickups
  const { data: myPickups, error } = await serviceClient
    .from('prayer_pickups')
    .select('id, prayer_request_id, created_at')
    .eq('team_member_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ pickups: myPickups })
}
