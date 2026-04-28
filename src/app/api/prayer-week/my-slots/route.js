import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

export async function GET() {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('prayer_week_signups')
    .select(`
      id, slot_id, notes, created_at,
      slot:prayer_week_slots ( id, starts_at, ends_at, event_id )
    `)
    .eq('visitor_id', visitor.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Sort signups chronologically by their slot time
  const signups = (data || []).slice().sort((a, b) =>
    new Date(a.slot?.starts_at || 0) - new Date(b.slot?.starts_at || 0)
  )

  return Response.json({ signups })
}

export async function PATCH(request) {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { signup_id, notes } = await request.json()
  if (!signup_id) return Response.json({ error: 'signup_id required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('prayer_week_signups')
    .update({ notes: notes || null })
    .eq('id', signup_id)
    .eq('visitor_id', visitor.id)
    .eq('status', 'confirmed')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
