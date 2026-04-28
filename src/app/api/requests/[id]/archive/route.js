import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

// Visitor archives their own request
export async function POST(request, { params }) {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('archive_prayer_request', {
    p_request_id: id,
    p_visitor_id: visitor.id,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data?.error) return Response.json({ error: data.error }, { status: 403 })
  return Response.json({ success: true })
}
