import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const cookieStore = cookies() as any
  const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { data: profile } = await anon.from('profiles').select('company_id,role').eq('id', user.id).single()
  if (!profile?.company_id) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  if (profile.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(()=>({}))
  const userId = (body.userId||'').trim()
  if (!/^[0-9a-fA-F-]{32,36}$/.test(userId)) return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'cannot_remove_self' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { error: err } = await service.from('profiles').update({ company_id: null, role: 'viewer' }).eq('id', userId).eq('company_id', profile.company_id)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() { return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 }) }
