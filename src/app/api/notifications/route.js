import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

export async function GET() {
  const session = await getVisitorSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('notifications')
    .select('*')
    .eq('visitor_id', session.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const unreadCount = (data || []).filter(n => !n.read).length
  return Response.json({ notifications: data, unread_count: unreadCount })
}

export async function PATCH(request) {
  const session = await getVisitorSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { notification_id, mark_all_read } = await request.json()
  const serviceClient = createServiceSupabaseClient()

  if (mark_all_read) {
    const { error } = await serviceClient
      .from('notifications')
      .update({ read: true })
      .eq('visitor_id', session.id)
      .eq('read', false)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  }

  if (notification_id) {
    const { error } = await serviceClient
      .from('notifications')
      .update({ read: true })
      .eq('id', notification_id)
      .eq('visitor_id', session.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
