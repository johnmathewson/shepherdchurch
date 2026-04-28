import { createServiceSupabaseClient } from '@/lib/supabase'
import { getVisitorSession } from '@/lib/auth'

export async function POST(request) {
  const visitor = await getVisitorSession()
  if (!visitor) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { signup_id } = await request.json()
  if (!signup_id) return Response.json({ error: 'signup_id required' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient.rpc('release_prayer_slot', {
    p_signup_id: signup_id,
    p_visitor_id: visitor.id,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (data?.error === 'not_found_or_unauthorized') {
    return Response.json({ error: 'Signup not found' }, { status: 404 })
  }
  return Response.json({ success: true })
}
