import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

// Visitor marks their own request as answered with a testimony
export async function POST(request, { params }) {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { testimony, share_publicly } = await request.json()
  if (!testimony?.trim()) return Response.json({ error: 'Testimony is required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('mark_request_answered', {
    p_request_id: id,
    p_visitor_id: visitor.id,
    p_testimony: testimony,
    p_share_publicly: share_publicly !== false, // default true
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data?.error) return Response.json({ error: data.error }, { status: 403 })
  return Response.json({ success: true })
}
