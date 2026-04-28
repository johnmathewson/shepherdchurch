import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'

// Called by /hub-handoff after the Supabase session is established.
// Verifies the user is a Supabase-authenticated team member with an approved
// team_members row, then sets the legacy `team_session` cookie so the existing
// getTeamSession() path (cached or not) recognizes them as team.
//
// This sidesteps any Netlify build-cache issues with lib/auth.js: the old
// cookie-based path is what's deployed, and we just feed it a valid cookie.
export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return Response.json({ ok: false, reason: 'no_supabase_user' }, { status: 401 })
  }

  const sc = createServiceSupabaseClient()
  const { data: tm, error: tmErr } = await sc
    .from('team_members')
    .select('id, display_name, email, role, approved, planning_center_id')
    .eq('auth_user_id', user.id)
    .eq('approved', true)
    .maybeSingle()
  if (tmErr) return Response.json({ ok: false, reason: `lookup_${tmErr.message}` }, { status: 500 })
  if (!tm) return Response.json({ ok: false, reason: 'not_team_member' }, { status: 403 })

  const token = await createSessionToken({
    role: 'team',
    id: tm.id,
    display_name: tm.display_name,
    email: tm.email,
    planning_center_id: tm.planning_center_id,
  })
  cookieStore.set('team_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24h, matches token exp
  })

  return Response.json({ ok: true, team_member: { id: tm.id, display_name: tm.display_name } })
}
