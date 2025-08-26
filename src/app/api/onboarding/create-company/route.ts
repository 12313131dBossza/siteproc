import { NextResponse } from 'next/server'
import { getSessionProfile, getSupabaseServer } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (session.companyId) return NextResponse.json({ error: 'already_in_company' }, { status: 400 })
  const body = await req.json().catch(()=>({}))
  const name = (body.name||'').trim()
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  const supabase = getSupabaseServer()
  const { data: company, error: cErr } = await supabase.from('companies').insert({ name }).select('id').single()
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  const { error: pErr } = await supabase.from('profiles').upsert({ id: session.user.id, company_id: company.id, role: 'admin' })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  return NextResponse.json({ companyId: company.id })
}
