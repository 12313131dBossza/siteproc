import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { parseJson } from '@/lib/api'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { supplierCreateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { broadcastDashboardUpdated } from '@/lib/realtime'

export async function GET(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const sb = supabaseService()
    const { data, error } = await sb.from('suppliers').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  try { enforceRole('manager', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
  const actorId = session.user?.id
    const payload = await parseJson(req, supplierCreateSchema)
    const sb = supabaseService()
    const { data, error } = await (sb as any).from('suppliers').insert({ company_id: companyId, ...payload } as any).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    try { await audit(companyId, actorId || null, 'supplier', (data as any)?.id, 'create', payload) } catch {}
    try { await broadcastDashboardUpdated(companyId) } catch {}
    return NextResponse.json({ id: (data as any)?.id })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
