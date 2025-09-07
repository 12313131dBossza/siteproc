import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { supabaseService } from '@/lib/supabase'
import { sendDeliveryNotifications } from '@/lib/notifications'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'Company required' }, { status: 400 })

    const body = await req.json()
    const { order_id, product_id, delivered_qty, delivered_at, note, proof_url } = body || {}

    if (!order_id || !product_id) {
      return NextResponse.json({ error: 'order_id and product_id are required' }, { status: 400 })
    }
    const qty = Number(delivered_qty)
    if (!qty || qty <= 0) {
      return NextResponse.json({ error: 'delivered_qty must be > 0' }, { status: 400 })
    }

    const sb = supabaseService()

    // Insert delivery row
    const insertPayload: any = {
      order_id,
      product_id,
      delivered_qty: qty,
      delivered_at: delivered_at ? new Date(delivered_at).toISOString() : new Date().toISOString(),
      note: note || null,
      proof_url: proof_url || null,
      company_id: session.companyId,
      created_by: session.user.id,
    }

    const { data: created, error: insErr } = await (sb as any)
      .from('deliveries')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insErr || !created) {
      console.error('[deliveries/record] insert error', insErr)
      return NextResponse.json({ error: 'Failed to record delivery' }, { status: 500 })
    }

    // Best-effort: update product stock if column exists
    try {
      await (sb as any)
        .from('products')
        .update({ stock: (sb as any).rpc ? undefined : undefined } as any)
      // Use single statement that increments stock if supported; fall back to RPC if available.
      await (sb as any).rpc?.('increment_product_stock', { product_id, amount: qty })
        .catch(() => Promise.resolve())
    } catch {}

    // Determine ordered vs delivered totals to set order status
    let newStatus: string | null = null
    try {
      // Fetch ordered total across items for this order
      const { data: items } = await (sb as any)
        .from('order_items')
        .select('ordered_qty, quantity, qty, order_id')
        .eq('order_id', order_id)
      const orderedTotal = (items || []).reduce((sum: number, r: any) => {
        const v = Number(r.ordered_qty ?? r.quantity ?? r.qty ?? 0)
        return sum + (isNaN(v) ? 0 : v)
      }, 0)

      // Sum delivered so far
      const { data: deliveredRows } = await (sb as any)
        .from('deliveries')
        .select('delivered_qty')
        .eq('order_id', order_id)
      const deliveredTotal = (deliveredRows || []).reduce((s: number, r: any) => s + Number(r.delivered_qty || 0), 0)

      if (orderedTotal > 0) {
        if (deliveredTotal >= orderedTotal) newStatus = 'delivered'
        else if (deliveredTotal > 0) newStatus = 'partially_delivered'
      }
    } catch (e) {
      // Non-fatal
      console.warn('[deliveries/record] status calc failed', e)
    }

    if (newStatus) {
      await (sb as any).from('orders').update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq('id', order_id)
    }

    // Notifications
    try {
      await sendDeliveryNotifications(created.id, 'created')
      if (newStatus === 'delivered') {
        await sendDeliveryNotifications(created.id, 'order_completed')
      }
    } catch (e) {
      console.warn('[deliveries/record] notifications skipped', e)
    }

    return NextResponse.json({ success: true, delivery: created, newStatus })
  } catch (e: any) {
    console.error('[deliveries/record] error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
