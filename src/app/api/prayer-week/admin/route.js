import { createServiceSupabaseClient } from '@/lib/supabase'
import { getTeamSession } from '@/lib/auth'

// Team-only: full slot/signup info including names and emails.
export async function GET(request) {
  const team = await getTeamSession()
  if (!team) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  if (!eventId) return Response.json({ error: 'event_id required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()

  const { data: slots, error } = await serviceClient
    .from('prayer_week_slots')
    .select(`
      id, starts_at, ends_at,
      signup:prayer_week_signups (
        id, display_name, email, planning_center_id, notes, status, created_at
      )
    `)
    .eq('event_id', eventId)
    .order('starts_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Filter signups to confirmed only (drop tentative holds from view)
  const cleaned = (slots || []).map(s => ({
    ...s,
    signup: Array.isArray(s.signup)
      ? s.signup.find(x => x.status === 'confirmed') || null
      : (s.signup?.status === 'confirmed' ? s.signup : null),
  }))

  // Coverage stats
  const total = cleaned.length
  const filled = cleaned.filter(s => s.signup).length
  const stats = {
    total,
    filled,
    open: total - filled,
    coverage_pct: total > 0 ? Math.round((filled / total) * 100) : 0,
  }

  return Response.json({ slots: cleaned, stats })
}

// Team-only: manually release a signup (e.g. someone bailed)
export async function DELETE(request) {
  const team = await getTeamSession()
  if (!team) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { signup_id } = await request.json()
  if (!signup_id) return Response.json({ error: 'signup_id required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('prayer_week_signups')
    .delete()
    .eq('id', signup_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
