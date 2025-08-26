import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  // 1. Get auth user via anon route handler client (respecting cookies)
  const cookieStore = cookies() as any
  const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value },
    }
  })
  const { data: { user }, error: userErr } = await anon.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(()=>({}))
  const name = (body.name||'').trim()
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Ensure profile row exists first (idempotent)
  const { error: upsertErr } = await service.from('profiles').upsert({ id: user.id, email: user.email || null }).eq('id', user.id)
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // Insert company
  const { data: company, error: companyErr } = await service.from('companies').insert({ name }).select('id').single()
  if (companyErr || !company) return NextResponse.json({ error: companyErr?.message || 'insert_failed' }, { status: 500 })

  // Update profile with company + admin role
  const { error: profUpdateErr } = await service.from('profiles').update({ company_id: company.id, role: 'admin' }).eq('id', user.id)
  if (profUpdateErr) return NextResponse.json({ error: profUpdateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
