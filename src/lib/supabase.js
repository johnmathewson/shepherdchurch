import { createBrowserClient as _createBrowserClient, createServerClient as _createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server client — uses cookies for per-request auth session (API routes, server components)
export function createServerSupabaseClient(cookieStore) {
  return _createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — cookies are read-only
        }
      },
    },
  })
}

// Browser client — for client components and realtime subscriptions
export function createBrowserSupabaseClient() {
  return _createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Service client — bypasses RLS, for server-side admin operations
export function createServiceSupabaseClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
