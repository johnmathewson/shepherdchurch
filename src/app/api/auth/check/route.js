import { getVisitorSession, getTeamSession } from '@/lib/auth'

export async function GET() {
  const visitor = await getVisitorSession()
  if (visitor) {
    return Response.json({
      authenticated: true,
      role: 'visitor',
      display_name: visitor.display_name,
      auth_method: visitor.authMethod || 'email',
    })
  }

  const team = await getTeamSession()
  if (team) {
    return Response.json({
      authenticated: true,
      role: 'team',
      display_name: team.display_name,
      is_admin: team.role === 'admin',
    })
  }

  return Response.json({ authenticated: false }, { status: 401 })
}
