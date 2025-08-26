import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { broadcastPoUpdated, broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  try { enforceRole('manager', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
    const id = context?.params?.id
    const sb = supabaseService()
  const { data: po } = await (sb as any).from('pos').select('id,status').eq('company_id', companyId).eq('id', id).single()
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (po.status === 'void') return NextResponse.json({ ok: true, status: 'void' })
    const terminal = ['complete','void']
  if (terminal.includes(po.status as string)) return NextResponse.json({ error: 'Terminal status' }, { status: 400 })
  const { error } = await (sb as any).from('pos').update({ status: 'void', updated_at: new Date().toISOString() } as any).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await broadcastPoUpdated(id, ['status'])
  try { await broadcastDashboardUpdated(companyId) } catch {}
    return NextResponse.json({ ok: true, status: 'void' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
