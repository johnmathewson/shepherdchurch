import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession, getTeamSession } from '@/lib/auth'

// Get updates for a request — visible to the visitor who owns it OR to the prayer team
export async function GET(request, { params }) {
  const { id } = await params
  const visitor = await getVisitorSession()
  const team = await getTeamSession()
  if (!visitor && !team) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()

  // If visitor, ensure they own the request
  if (visitor && !team) {
    const { data: req } = await serviceClient
      .from('prayer_requests')
      .select('id, visitor_id')
      .eq('id', id)
      .maybeSingle()
    if (!req || req.visitor_id !== visitor.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const { data, error } = await serviceClient
    .from('prayer_request_updates')
    .select('*')
    .eq('prayer_request_id', id)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ updates: data || [] })
}
