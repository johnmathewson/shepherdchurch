import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

// Confirm a held slot (post-login) OR directly claim a slot (already-logged-in flow)
// Body shape:
//   { hold_token, notes? }       -> confirms a hold made before login
//   { slot_id, notes? }          -> direct claim (no hold flow needed)
export async function POST(request) {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const serviceClient = createServiceSupabaseClient()

  if (body.hold_token) {
    const { data, error } = await serviceClient.rpc('claim_prayer_slot', {
      p_hold_token: body.hold_token,
      p_visitor_id: visitor.id,
      p_display_name: visitor.display_name,
      p_email: visitor.email,
      p_planning_center_id: visitor.planningCenterId || null,
      p_notes: body.notes || null,
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (data?.error === 'hold_expired_or_invalid') {
      return Response.json({ error: 'Your hold expired. Please pick the slot again.' }, { status: 410 })
    }
    return Response.json({ success: true, signup_id: data.signup_id, slot_id: data.slot_id })
  }

  if (body.slot_id) {
    const { data, error } = await serviceClient.rpc('direct_claim_prayer_slot', {
      p_slot_id: body.slot_id,
      p_visitor_id: visitor.id,
      p_display_name: visitor.display_name,
      p_email: visitor.email,
      p_planning_center_id: visitor.planningCenterId || null,
      p_notes: body.notes || null,
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (data?.error === 'slot_taken') {
      return Response.json({ error: 'This slot was just taken. Please pick another.' }, { status: 409 })
    }
    return Response.json({ success: true, signup_id: data.signup_id })
  }

  return Response.json({ error: 'hold_token or slot_id required' }, { status: 400 })
}
