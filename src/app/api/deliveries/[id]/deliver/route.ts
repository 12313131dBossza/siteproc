import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'
import { broadcastDeliveryUpdated, broadcast } from '@/lib/realtime'
import { EVENTS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const sb = supabaseService()
  const { data: delivery } = await (sb as any).from('deliveries').select('id,status,job_id').eq('company_id', companyId).eq('id', id).single()
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((delivery as any).status === 'delivered') return NextResponse.json({ ok: true, status: 'delivered' })
    const { error } = await (sb as any)
      .from('deliveries')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() } as any)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await Promise.all([
      broadcastDeliveryUpdated(id, ['status']),
  (delivery as any)?.job_id ? broadcast(`job:${(delivery as any).job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { job_id: (delivery as any).job_id, delivery_id: id, at: new Date().toISOString(), status: 'delivered' }) : Promise.resolve(),
    ])
    return NextResponse.json({ ok: true, status: 'delivered' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
