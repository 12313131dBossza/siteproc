import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface RequireAdminResult {
  ok: boolean
  userId?: string
  companyId?: string
  role?: string
  reason?: string
}

export async function requireAdmin(options?: { redirectOnFail?: boolean }): Promise<RequireAdminResult> {
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    if (options?.redirectOnFail !== false) redirect('/login')
    return { ok:false, reason:'unauthenticated' }
  }
  const { data: profile } = await supabase.from('profiles').select('id,company_id,role').eq('id', user.id).single()
  if (!profile?.company_id) return { ok:false, reason:'no_company' }
  if (profile.role !== 'admin') {
    if (options?.redirectOnFail) redirect('/admin/dashboard')
    return { ok:false, reason:'forbidden', userId: user.id, companyId: profile.company_id, role: profile.role }
  }
  return { ok:true, userId: user.id, companyId: profile.company_id, role: profile.role }
}
