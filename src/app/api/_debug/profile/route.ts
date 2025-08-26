import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const cookieStore = cookies() as any
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!
  const userClient = createServerClient(url, anonKey, { cookies: { get(name:string){ return cookieStore.get(name)?.value } } })
  const { data: { user } } = await userClient.auth.getUser()
  let profile_user: any = null
  let profile_admin: any = null
  if (user) {
    const { data: pu } = await userClient.from('profiles').select('company_id').eq('id', user.id).single()
    profile_user = pu
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: pa } = await admin.from('profiles').select('company_id').eq('id', user.id).single()
    profile_admin = pa
  }
  return NextResponse.json({ user: user ? { id: user.id, email: user.email } : null, profile_user, profile_admin, now: new Date().toISOString() })
}