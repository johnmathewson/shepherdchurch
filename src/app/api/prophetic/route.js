import { createServiceSupabaseClient } from '@/lib/supabase'
import { getTeamSession, getVisitorSession } from '@/lib/auth'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('request_id')

  if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 })

  const visitorSession = await getVisitorSession()
  const teamSession = await getTeamSession()

  if (!visitorSession && !teamSession) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('prophetic_words')
    .select('id, content, created_at')
    .eq('prayer_request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ words: data })
}

export async function POST(request) {
  const session = await getTeamSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id, content } = await request.json()

  if (!request_id || !content) {
    return Response.json({ error: 'request_id and content required' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('add_prophetic_word', {
    p_request_id: request_id,
    p_team_member_id: session.id,
    p_content: content,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data.error) return Response.json({ error: data.error }, { status: 400 })

  // Send email notification (fire-and-forget, added in Phase 3)
  try {
    const { sendPropheticWordEmail } = await import('@/lib/email')
    sendPropheticWordEmail(request_id, content, serviceClient)
  } catch { /* email module not yet available */ }

  return Response.json({ success: true })
}
