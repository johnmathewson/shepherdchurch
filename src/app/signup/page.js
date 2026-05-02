import { redirect } from 'next/navigation'

// Signup is unified with sign-in: magic-link auth on /login auto-creates the
// account on first verify, so a separate signup page is no longer needed.
// This redirect keeps any existing /signup links working.
export default function SignupPage() {
  redirect('/login')
}
