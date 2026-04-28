import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

// Visitor adds an update to their own request
export async function POST(request, { params }) {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim()) return Response.json({ error: 'Content is required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('add_request_update', {
    p_request_id: id,
    p_visitor_id: visitor.id,
    p_content: content,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data?.error) return Response.json({ error: data.error }, { status: 403 })
  return Response.json({ success: true })
}
