import { createServiceSupabaseClient } from '@/lib/supabase'
import { getTeamSession } from '@/lib/auth'

export async function POST(request) {
  const session = await getTeamSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id } = await request.json()
  const serviceClient = createServiceSupabaseClient()

  const { data, error } = await serviceClient.rpc('pickup_prayer_request', {
    p_request_id: request_id,
    p_team_member_id: session.id,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data.error) return Response.json({ error: data.error }, { status: 400 })

  // Send email notification (fire-and-forget, added in Phase 3)
  try {
    const { sendPickupEmail } = await import('@/lib/email')
    sendPickupEmail(request_id, serviceClient)
  } catch { /* email module not yet available */ }

  return Response.json({ success: true })
}
