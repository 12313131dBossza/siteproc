import { NextResponse } from 'next/server'
import { getSessionProfile, getSupabaseServer } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (session.companyId) return NextResponse.json({ error: 'already_in_company' }, { status: 400 })
  const body = await req.json().catch(()=>({}))
  const companyId = (body.companyId||'').trim()
  if (!companyId) return NextResponse.json({ error: 'companyId_required' }, { status: 400 })
  const supabase = getSupabaseServer()
  const { data: company } = await supabase.from('companies').select('id').eq('id', companyId).single()
  if (!company) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { error } = await supabase.from('profiles').upsert({ id: session.user.id, company_id: company.id, role: 'viewer' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ companyId })
}
