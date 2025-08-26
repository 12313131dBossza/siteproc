import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const cookieStore = cookies() as any
  const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string){ return cookieStore.get(name)?.value } }
  })
  const { data: { user }, error: userErr } = await anon.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(()=>({}))
  const companyId = (body.companyId||'').trim()
  if (!companyId) return NextResponse.json({ error: 'companyId_required' }, { status: 400 })
  // basic UUID format check
  if(!/^[0-9a-fA-F-]{32,36}$/.test(companyId)) return NextResponse.json({ error: 'invalid_company_id' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Ensure profile row exists
  const { error: upsertErr } = await service.from('profiles').upsert({ id: user.id, email: user.email || null }).eq('id', user.id)
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  const { data: company } = await service.from('companies').select('id').eq('id', companyId).single()
  if (!company) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { error: profileUpdateErr } = await service.from('profiles').update({ company_id: company.id, role: 'viewer' }).eq('id', user.id)
  if (profileUpdateErr) return NextResponse.json({ error: profileUpdateErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
