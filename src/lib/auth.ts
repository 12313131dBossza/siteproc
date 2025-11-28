import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export interface SessionProfile {
  user: { id: string; email?: string | null } | null
  companyId: string | null
  role: string | null
  profile: any
}

function getUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing')
  return url
}
function getAnon() {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!k) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
  return k
}

export function getSupabaseServer() {
  const cookieStore = cookies() as any
  return createServerClient(getUrl(), getAnon(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = getSupabaseServer()
  // Use getUser() instead of getSession() for secure server-side authentication
  // getSession() reads from cookies which could be tampered with
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, companyId: null, role: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return {
    user: { id: user.id, email: user.email },
    companyId: profile?.company_id ?? null,
    role: profile?.role ?? null,
    profile: profile || null,
  }
}

const ROLE_ORDER = ['viewer','bookkeeper','manager','admin'] as const
type Role = typeof ROLE_ORDER[number]

export function enforceRole(min: Role, session: SessionProfile) {
  if (!session.user) throw new Response('Unauthenticated', { status: 401 })
  if (!session.companyId) throw new Response('No company', { status: 400 })
  if (!session.role) throw new Response('Forbidden', { status: 403 })
  if (ROLE_ORDER.indexOf(session.role as Role) < ROLE_ORDER.indexOf(min)) throw new Response('Forbidden', { status: 403 })
}