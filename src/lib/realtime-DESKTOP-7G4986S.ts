import { supabaseService } from './supabase'
import { EVENTS } from './constants'

// Broadcast a realtime event on a channel and immediately dispose the channel.
// Works server-side using the service role key.
export async function broadcast(channelName: string, event: string, payload?: Record<string, any>) {
  const sb = supabaseService()
  const ch = sb.channel(channelName)
  await new Promise<void>((resolve, reject) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CHANNEL_ERROR') reject(new Error('Realtime channel error'))
    })
  })
  try {
    await ch.send({ type: 'broadcast', event, payload: payload || {} })
  } catch {}
  try { await ch.unsubscribe() } catch {}
}

export async function broadcastPoUpdated(id: string, fields?: string[]) {
  await broadcast(`po:${id}`, EVENTS.PO_UPDATED, { id, fields: fields || [] , at: new Date().toISOString() })
}

export async function broadcastDeliveryUpdated(id: string, fields?: string[]) {
  await broadcast(`delivery:${id}`, EVENTS.DELIVERY_UPDATED, { id, fields: fields || [], at: new Date().toISOString() })
}

export async function broadcastExpenseUpdated(id: string, fields?: string[]) {
  await broadcast(`expense:${id}`, EVENTS.EXPENSE_UPDATED, { id, fields: fields || [], at: new Date().toISOString() })
}

export async function broadcastJobPo(jobId: string, poId: string) {
  await broadcast(`job:${jobId}`, EVENTS.JOB_PO_UPDATED, { kind: 'po', job_id: jobId, po_id: poId, at: new Date().toISOString() })
}

export async function broadcastJobChangeOrder(jobId: string, coId: string, status?: string) {
  await broadcast(`job:${jobId}`, EVENTS.JOB_CHANGE_ORDER_UPDATED, { kind: 'change_order', job_id: jobId, change_order_id: coId, status, at: new Date().toISOString() })
}
