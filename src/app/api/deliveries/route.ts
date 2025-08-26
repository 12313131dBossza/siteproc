import { uploadPrivateSigned } from '@/lib/storage'
import { EVENTS } from '@/lib/constants'

// Reintroduced imports (file was previously corrupted during patching)
import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { parseJson } from '@/lib/api'
import { deliveryCreateSchema } from '@/lib/validation'
import { broadcastDeliveryUpdated, broadcast, broadcastPoUpdated, broadcastDashboardUpdated } from '@/lib/realtime'
import { getSessionProfile, enforceRole } from '@/lib/auth'

export const runtime = 'nodejs'

async function uploadDataUrl(sb: ReturnType<typeof supabaseService>, path: string, dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!match) throw new Error('Bad data URL')
  const base64 = match[2]
  const bytes = Buffer.from(base64, 'base64')
  const url = await uploadPrivateSigned(path, bytes, match[1])
  return url
}

export async function POST(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  // 'foreman' legacy role mapped to 'viewer' minimum permission for creation; adjust if stricter needed
  enforceRole('viewer', session)
  const payload = await parseJson(req, deliveryCreateSchema)
  const sb = supabaseService()

  const { data: delivery, error } = await (sb as any)
    .from('deliveries')
    .insert({
  company_id: session.companyId,
      job_id: payload.job_id,
      po_id: payload.po_id ?? null,
      notes: payload.notes ?? null,
      signer_name: payload.signer_name ?? null,
    })
    .select('*')
    .single()
  if (error || !delivery) return NextResponse.json({ error: error?.message || 'create failed' }, { status: 500 })

  const items = payload.items.map((it: any) => ({
  company_id: session.companyId,
    delivery_id: delivery.id,
    description: it.description,
    qty: it.qty,
    unit: it.unit,
    sku: it.sku,
    partial: !!it.partial,
  }))
  const { error: itemsErr } = await (sb as any).from('delivery_items').insert(items as any)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  const photoUrls: string[] = []
  for (let i = 0; i < (payload.photo_data_urls?.length || 0); i++) {
    const url = await uploadDataUrl(sb, `deliveries/${delivery.id}/${i}.jpg`, payload.photo_data_urls![i])
    photoUrls.push(url)
  }
  if (payload.signature_data_url) {
    const sig = await uploadDataUrl(sb, `deliveries/${delivery.id}/signature.png`, payload.signature_data_url)
    await (sb as any).from('deliveries').update({ signature_url: sig } as any).eq('id', delivery.id as string)
  }
  for (const url of photoUrls) {
    await (sb as any).from('photos').insert({ company_id: session.companyId, job_id: payload.job_id, entity: 'delivery', entity_id: delivery.id, url } as any)
  }

  await audit(session.companyId as string, session.user.id, 'delivery', delivery.id as string, 'create', { items: items.length, photos: photoUrls.length })
  await Promise.all([
    broadcastDeliveryUpdated(delivery.id as string, ['create']),
    broadcast(`job:${payload.job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { kind: 'delivery', job_id: payload.job_id, delivery_id: delivery.id as string, at: new Date().toISOString() }),
    broadcastDashboardUpdated(session.companyId!)
  ])

  if (payload.po_id) {
    try {
      const sb2 = sb
      const { data: po } = await (sb2 as any).from('pos').select('id,rfq_id,status').eq('id', payload.po_id as string).eq('company_id', session.companyId).single()
      if (po && po.rfq_id) {
        const { data: orderedItems } = await (sb2 as any).from('rfq_items').select('qty').eq('company_id', session.companyId).eq('rfq_id', po.rfq_id as string)
  const orderedTotal = (orderedItems || []).reduce((s: number, r: any) => s + Number(r.qty || 0), 0)
        const { data: allDelivs } = await (sb2 as any).from('deliveries').select('id,notes').eq('company_id', session.companyId).eq('po_id', payload.po_id as string)
        const deliveryIds = (allDelivs || []).map((d: any) => d.id)
        let deliveredTotal = 0
        if (deliveryIds.length) {
          const { data: allItems } = await (sb2 as any).from('delivery_items').select('qty,delivery_id').in('delivery_id', deliveryIds as any)
          deliveredTotal = (allItems || []).reduce((s: number, r: any) => s + Number(r.qty || 0), 0)
        }
        if (orderedTotal > 0) {
          if (deliveredTotal >= orderedTotal) {
            if (po.status !== 'complete') {
              await (sb2 as any).from('pos').update({ status: 'complete', updated_at: new Date().toISOString() } as any).eq('id', po.id as string)
              await broadcastPoUpdated(po.id as string, ['status'])
              await audit(session.companyId as string, session.user.id, 'po', po.id as string, 'status_auto_complete', { delivered_total: deliveredTotal, ordered_total: orderedTotal })
            }
            for (const d of (allDelivs || [])) {
              if (d.notes && typeof d.notes === 'string' && d.notes.startsWith('Backorder')) {
                await (sb2 as any).from('deliveries').update({ status: 'delivered', updated_at: new Date().toISOString() } as any).eq('id', d.id as string)
              }
            }
          } else {
            const remaining = orderedTotal - deliveredTotal
            const existingBackorder = (allDelivs || []).find((d: any) => d.notes && typeof d.notes === 'string' && d.notes.startsWith('Backorder'))
            if (!existingBackorder) {
              const { data: backorder, error: boErr } = await (sb2 as any).from('deliveries').insert({
                company_id: session.companyId,
                job_id: payload.job_id,
                po_id: payload.po_id,
                status: 'pending',
                notes: `Backorder remaining ${remaining}`,
              }).select('id').single()
              if (!boErr && backorder) {
                await (sb2 as any).from('delivery_items').insert({
                  company_id: session.companyId,
                  delivery_id: backorder.id,
                  description: 'Backorder',
                  qty: remaining,
                  partial: true,
                } as any)
                await audit(session.companyId as string, session.user.id, 'delivery', backorder.id as string, 'backorder_create', { remaining })
                await broadcast(`job:${payload.job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { kind: 'delivery', job_id: payload.job_id, delivery_id: backorder.id as string, at: new Date().toISOString() })
              }
            } else {
              const note = `Backorder remaining ${remaining}`
              if (existingBackorder.notes !== note) {
                await (sb2 as any).from('deliveries').update({ notes: note, updated_at: new Date().toISOString() } as any).eq('id', existingBackorder.id as string)
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[po-backorder]', e?.message || e)
    }
  }

  return NextResponse.json({ id: delivery.id })
}

export async function GET(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')
    if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 })
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)
    const cursor = url.searchParams.get('cursor')
    const sb = supabaseService()
    let q = sb
      .from('deliveries')
      .select('id,job_id,po_id,status,delivered_at,created_at')
  .eq('company_id', session.companyId)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)
    if (cursor) q = (q as any).lt('created_at', cursor)
    const { data, error } = await q as any
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (data || []) as any[]
    let nextCursor: string | null = null
    if (items.length > limit) {
      const extra = items.pop()
      nextCursor = items[items.length - 1]?.created_at || extra?.created_at || null
    }
    return NextResponse.json({ items, nextCursor })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
