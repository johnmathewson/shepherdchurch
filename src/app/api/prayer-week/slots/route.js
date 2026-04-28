import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

// Public endpoint: returns slots with public status (open/filled).
// If the visitor is logged in, also marks slots they own as 'mine'.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  if (!eventId) return Response.json({ error: 'event_id required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()

  const { data: slots, error } = await serviceClient
    .from('prayer_week_public_slots')
    .select('*')
    .eq('event_id', eventId)
    .order('starts_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // If logged in, fetch their confirmed signups so we can mark "mine"
  const visitor = await getVisitorSession()
  let mySignups = []
  if (visitor) {
    const { data: own } = await serviceClient
      .from('prayer_week_signups')
      .select('id, slot_id, notes')
      .eq('visitor_id', visitor.id)
      .eq('status', 'confirmed')
    mySignups = own || []
  }
  const mineMap = new Map(mySignups.map(s => [s.slot_id, s]))

  const enriched = slots.map(s => ({
    ...s,
    mine: mineMap.has(s.id),
    signup_id: mineMap.get(s.id)?.id || null,
  }))

  return Response.json({ slots: enriched })
}
