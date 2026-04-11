import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function POST(request) {
  const body = await request.json()
  const { action } = body

  if (action === 'visitor_signup') {
    const { email, password, display_name } = body
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) return Response.json({ error: authError.message }, { status: 400 })

    // Create the visitor profile
    const serviceClient = createServiceSupabaseClient()
    const { data: visitor, error: profileError } = await serviceClient.rpc('create_visitor_profile', {
      p_auth_user_id: authData.user.id,
      p_email: email,
      p_display_name: display_name,
    })

    if (profileError) return Response.json({ error: profileError.message }, { status: 500 })

    return Response.json({
      success: true,
      visitor: { id: visitor.id, display_name: visitor.display_name },
    })
  }

  if (action === 'visitor_login') {
    const { email, password } = body
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return Response.json({ error: error.message }, { status: 401 })

    // Ensure visitor profile exists
    const serviceClient = createServiceSupabaseClient()
    const { data: visitor } = await serviceClient
      .from('visitors')
      .select('id, display_name')
      .eq('auth_user_id', data.user.id)
      .single()

    return Response.json({
      success: true,
      visitor: visitor || { id: data.user.id },
    })
  }

  if (action === 'visitor_logout') {
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)
    await supabase.auth.signOut()
    return Response.json({ success: true })
  }

  if (action === 'logout') {
    // Clear all sessions (visitor + team)
    const cookieStore = await cookies()
    const supabase = createServerSupabaseClient(cookieStore)
    await supabase.auth.signOut()
    cookieStore.delete('team_session')
    return Response.json({ success: true })
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
