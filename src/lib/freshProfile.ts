import { unstable_noStore as noStore } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface FreshProfileResult {
  user: any | null
  profile: { company_id?: string | null; role?: string | null } | null
}

export async function freshProfile(): Promise<FreshProfileResult> {
  noStore()
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string){ return cookieStore.get(name)?.value } }
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  return { user, profile: profile || null }
}