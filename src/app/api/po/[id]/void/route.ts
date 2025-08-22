import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds, requireRole } from '@/lib/api'
import { broadcastPoUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
  const { companyId, role } = getIds(_req)
  requireRole(role, 'admin')
    const id = params.id
    const sb = supabaseService()
    const { data: po } = await sb.from('pos').select('id,status').eq('company_id', companyId).eq('id', id).single()
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (po.status === 'void') return NextResponse.json({ ok: true, status: 'void' })
    const terminal = ['complete','void']
  if (terminal.includes(po.status as string)) return NextResponse.json({ error: 'Terminal status' }, { status: 400 })
    const { error } = await sb.from('pos').update({ status: 'void', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await broadcastPoUpdated(id, ['status'])
    return NextResponse.json({ ok: true, status: 'void' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
