import { getVisitorSession, getTeamSession } from '@/lib/auth'

// Returns full auth state — visitor AND team membership — so client UIs
// can show cross-context affordances (e.g. "Switch to Team View" link
// on the visitor dashboard for someone who's also on the prayer team).
//
// Backwards-compat shape: top-level `role`, `display_name`, `is_admin`
// still mirror the previous behavior for older callers.
export async function GET() {
  const visitor = await getVisitorSession()
  const team = await getTeamSession()

  if (!visitor && !team) {
    return Response.json({ authenticated: false }, { status: 401 })
  }

  // Top-level shape (unchanged for existing callers — visitor wins if both)
  const top = visitor
    ? {
        authenticated: true,
        role: 'visitor',
        display_name: visitor.display_name,
        auth_method: visitor.authMethod || 'email',
      }
    : {
        authenticated: true,
        role: 'team',
        display_name: team.display_name,
        is_admin: team.role === 'admin',
      }

  return Response.json({
    ...top,
    // Always include both so the UI can detect dual roles.
    visitor: visitor
      ? {
          id: visitor.id,
          display_name: visitor.display_name,
          email: visitor.email,
          auth_method: visitor.authMethod || 'email',
        }
      : null,
    team: team
      ? {
          id: team.id,
          display_name: team.display_name,
          email: team.email,
          role: team.role,
          is_admin: team.role === 'admin',
        }
      : null,
  })
}
