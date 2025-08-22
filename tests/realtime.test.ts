import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture events sent via broadcast
interface SentEvent { channel: string; event: string; payload: any }
const sent: SentEvent[] = []

let unsubscribedChannels: string[] = []

// Mock supabaseService to provide a minimal channel API used by broadcast()
vi.mock('@/lib/supabase', () => {
  return {
    supabaseService: () => ({
      channel: (name: string) => {
        return {
          name,
          subscribe(cb: (status: string) => void) {
            // immediately signal subscribed
            cb('SUBSCRIBED')
            return this
          },
          async send(msg: any) {
            sent.push({ channel: name, event: msg.event, payload: msg.payload })
          },
          async unsubscribe() {
            unsubscribedChannels.push(name)
          },
        }
      },
    }),
  }
})

import { broadcastPoUpdated, broadcastDeliveryUpdated, broadcastExpenseUpdated } from '@/lib/realtime'
import { EVENTS } from '@/lib/constants'

beforeEach(() => {
  sent.length = 0
  unsubscribedChannels = []
})

describe('realtime broadcast helpers', () => {
  it('broadcastPoUpdated sends correct event + payload and unsubscribes', async () => {
    await broadcastPoUpdated('abc-123', ['total'])
    expect(sent).toHaveLength(1)
    expect(sent[0].channel).toBe('po:abc-123')
    expect(sent[0].event).toBe(EVENTS.PO_UPDATED)
    expect(sent[0].payload.id).toBe('abc-123')
    expect(sent[0].payload.fields).toEqual(['total'])
    expect(unsubscribedChannels).toContain('po:abc-123')
  })

  it('broadcastDeliveryUpdated uses delivery channel + event', async () => {
    await broadcastDeliveryUpdated('d1')
    expect(sent[0].channel).toBe('delivery:d1')
    expect(sent[0].event).toBe(EVENTS.DELIVERY_UPDATED)
  })

  it('broadcastExpenseUpdated uses expense channel + event', async () => {
    await broadcastExpenseUpdated('e1', ['memo'])
    expect(sent[0].channel).toBe('expense:e1')
    expect(sent[0].event).toBe(EVENTS.EXPENSE_UPDATED)
    expect(sent[0].payload.fields).toEqual(['memo'])
  })
})
