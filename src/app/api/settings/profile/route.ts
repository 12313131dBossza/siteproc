import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const cookieStore = cookies() as any
  const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const body = await req.json().catch(()=>({}))
  let fullName = (body.fullName||'').trim()
  if (fullName.length > 80) fullName = fullName.slice(0,80)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { error: updateErr } = await service.from('profiles').update({ full_name: fullName || null }).eq('id', user.id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() { return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 }) }
