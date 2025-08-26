import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function maskUrl(full?: string) {
  if (!full) return null
  try {
    const u = new URL(full)
    const h = u.hostname
    const masked = h.length <= 12 ? h : `${h.slice(0,6)}…${h.slice(-4)}`
    return { origin: `${u.protocol}//${masked}`, db: masked }
  } catch { return { origin: 'invalid', db: 'invalid' } }
}

export async function GET() {
  const cookieStore = cookies() as any
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  const masked = maskUrl(url)
  let userData: any = null
  let profile_user: any = null
  let profile_admin: any = null
  if (url && anonKey) {
    try {
      const userClient = createServerClient(url, anonKey, { cookies: { get(name:string){ return cookieStore.get(name)?.value } } })
      const { data: { user } } = await userClient.auth.getUser()
      userData = user ? { id: user.id, email: user.email } : null
      if (user) {
        const { data: pu } = await userClient.from('profiles').select('company_id').eq('id', user.id).single()
        profile_user = pu || null
        if (serviceKey) {
          const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
          const { data: pa } = await admin.from('profiles').select('company_id').eq('id', user.id).single()
          profile_admin = pa || null
        }
      }
    } catch (e:any) {
      console.error('[api/_debug/env] error', e?.message)
    }
  }
  const payload = {
    supabase_url_masked: masked,
    anon_key_set: !!anonKey,
    service_key_set: !!serviceKey,
    user: userData,
    profile_user,
    profile_admin,
    now: new Date().toISOString()
  }
  console.log('[api/_debug/env]', payload)
  return NextResponse.json(payload)
}