import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession, getTeamSession } from '@/lib/auth'

// Archive a prayer request. Two callers:
//   - The visitor who owns the request (uses ownership-checked RPC)
//   - An admin team member (bypasses ownership)
export async function POST(request, { params }) {
  const { id } = await params
  const serviceClient = createServiceSupabaseClient()

  // Visitor archiving their own
  const visitor = await getVisitorSession()
  if (visitor) {
    const { data, error } = await serviceClient.rpc('archive_prayer_request', {
      p_request_id: id,
      p_visitor_id: visitor.id,
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (data?.error) {
      // not_found_or_unauthorized — fall through to admin check before
      // returning, so a person who is BOTH a visitor and an admin can still
      // archive someone else's request from the admin panel.
      const team = await getTeamSession()
      if (team?.role === 'admin') return adminArchive(serviceClient, id)
      return Response.json({ error: data.error }, { status: 403 })
    }
    return Response.json({ success: true })
  }

  // No visitor session — admin path only
  const team = await getTeamSession()
  if (team?.role === 'admin') return adminArchive(serviceClient, id)

  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

async function adminArchive(serviceClient, id) {
  const { data, error } = await serviceClient
    .from('prayer_requests')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'not_found' }, { status: 404 })
  return Response.json({ success: true })
}
