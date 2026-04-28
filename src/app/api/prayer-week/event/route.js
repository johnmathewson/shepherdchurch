import { createServiceSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const serviceClient = createServiceSupabaseClient()

  const { data: event, error } = await serviceClient
    .from('prayer_week_events')
    .select('*')
    .eq('status', 'published')
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!event) return Response.json({ error: 'No active event' }, { status: 404 })

  return Response.json({ event })
}
