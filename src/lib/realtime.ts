import { supabaseService } from './supabase'

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
  // Fire and forget. Ignore failures so user flow isn’t blocked.
  try {
    await ch.send({ type: 'broadcast', event, payload: payload || {} })
  } catch {}
  try { await ch.unsubscribe() } catch {}
}

export async function broadcastPoUpdated(id: string, fields?: string[]) {
  await broadcast(`po:${id}`, 'po-updated', { id, fields: fields || [] , at: new Date().toISOString() })
}
