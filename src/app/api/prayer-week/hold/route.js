import { createServiceSupabaseClient } from '@/lib/supabase'

// Place a 5-minute tentative hold on a slot. No auth required.
// Returns a hold_token that the client passes through login back to /claim.
export async function POST(request) {
  const { slot_id } = await request.json()
  if (!slot_id) return Response.json({ error: 'slot_id required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('hold_prayer_slot', { p_slot_id: slot_id })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data?.error === 'slot_taken') {
    return Response.json({ error: 'This slot was just taken. Please pick another.' }, { status: 409 })
  }

  return Response.json({
    hold_token: data.hold_token,
    expires_in_seconds: data.expires_in_seconds,
  })
}
