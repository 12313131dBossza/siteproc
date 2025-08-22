import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'
import { broadcastDeliveryUpdated, broadcast } from '@/lib/realtime'
import { EVENTS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { companyId } = getIds(_req)
    const id = params.id
    const sb = supabaseService()
  const { data: delivery } = await sb.from('deliveries').select('id,status,job_id').eq('company_id', companyId).eq('id', id).single()
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (delivery.status === 'delivered') return NextResponse.json({ ok: true, status: 'delivered' })
    const { error } = await sb
      .from('deliveries')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await Promise.all([
      broadcastDeliveryUpdated(id, ['status']),
      delivery?.job_id ? broadcast(`job:${delivery.job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { job_id: delivery.job_id, delivery_id: id, at: new Date().toISOString(), status: 'delivered' }) : Promise.resolve(),
    ])
    return NextResponse.json({ ok: true, status: 'delivered' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
