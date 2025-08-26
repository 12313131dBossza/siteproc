import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (session.companyId) return NextResponse.json({ error: 'already_in_company' }, { status: 400 })
  const body = await req.json().catch(()=>({}))
  const name = (body.name||'').trim()
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  // Service role client (bypasses RLS for provisioning)
  const supabaseService = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: company, error: cErr } = await supabaseService.from('companies').insert({ name }).select('id').single()
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  const { error: pErr } = await supabaseService.from('profiles').update({ company_id: company.id, role: 'admin' }).eq('id', session.user.id)
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
