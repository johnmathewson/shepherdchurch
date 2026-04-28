import { createServiceSupabaseClient } from '@/lib/supabase'

// Public feed of answered prayers (anonymous, opt-in only)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  const serviceClient = createServiceSupabaseClient()
  let query = serviceClient
    .from('answered_prayers_public')
    .select('*')
    .order('outcome_at', { ascending: false })
    .limit(60)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ answered: data || [] })
}
