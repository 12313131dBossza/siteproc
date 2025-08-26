import { describe, it, expect, vi, beforeEach } from 'vitest'

// This smoke test simulates a sequence of mutations that should each trigger a dashboard broadcast.
// We mock the broadcastDashboardUpdated helper to record calls.

const calls: any[] = []

vi.mock('@/lib/realtime', async (orig) => {
  const actual: any = await orig()
  return {
    ...actual,
    broadcastDashboardUpdated: vi.fn(async (companyId: string | 'demo') => {
      calls.push({ companyId })
    }),
  }
})

// Mock supabase service minimal insert/select paths used in route handlers.
vi.mock('@/lib/supabase', () => {
  function builder(table: string) {
    return {
      insert(row: any) {
        return { select() { return { async single() { return { data: { id: `${table}-new`, job_id: row.job_id || null }, error: null } } } } }
      },
      update() { return { eq() { return { then() {} } } } },
      select() { return { eq() { return this }, order() { return this }, limit() { return this }, single: async () => ({ data: { id: `${table}-row`, job_id: 'job-1' }, error: null }) } },
      eq() { return this },
      order() { return this },
    }
  }
  return { supabaseService: () => ({ from: (t: string) => builder(t), channel: () => ({ subscribe: (cb: any) => { cb('SUBSCRIBED'); return { send: async () => {}, unsubscribe: async () => {} } } }) }) }
})

function req(url: string, method: string, body?: any) {
  return new Request(url, { method, headers: { 'content-type': 'application/json', 'x-company-id': 'comp-1' }, body: body ? JSON.stringify(body) : undefined })
}

// Import routes AFTER mocks
import * as expensesRoute from '@/app/api/expenses/route'
import * as deliveriesRoute from '@/app/api/deliveries/route'
import * as rfqsRoute from '@/app/api/rfqs/route'
import * as rfqSendRoute from '@/app/api/rfqs/[id]/send/route'
import * as rfqResendRoute from '@/app/api/rfqs/[id]/resend/route'
import * as quotesSelectRoute from '@/app/api/quotes/[id]/select/route'
import * as changeOrdersRoute from '@/app/api/change-orders/route'

beforeEach(() => { calls.length = 0 })

describe('dashboard mutation smoke sequence', () => {
  it('performs sequence and records broadcasts', async () => {
    // 1. create expense
    await expensesRoute.POST(req('http://localhost/api/expenses', 'POST', { job_id: 'job-1', amount: 5, spent_at: '2030-01-01' }) as any)
    // 2. create delivery
    await deliveriesRoute.POST(req('http://localhost/api/deliveries', 'POST', { job_id: 'job-1', items: [{ description: 'X', qty: 1 }] }) as any)
    // 3. create rfq
    const rfqRes = await rfqsRoute.POST(req('http://localhost/api/rfqs', 'POST', { job_id: 'job-1', title: 'Test RFQ' }) as any)
    const rfqJson: any = await rfqRes.json()
    // 4. send rfq
    await rfqSendRoute.POST(req(`http://localhost/api/rfqs/${rfqJson.id}/send`, 'POST') as any, { params: { id: rfqJson.id } } as any)
    // 5. resend rfq
    await rfqResendRoute.POST(req(`http://localhost/api/rfqs/${rfqJson.id}/resend`, 'POST') as any, { params: { id: rfqJson.id } } as any)
    // 6. select quote (creates PO)
    await quotesSelectRoute.POST(req('http://localhost/api/quotes/quote-1/select', 'POST') as any, { params: { id: 'quote-1' } } as any)
    // 7. create change order
    await changeOrdersRoute.POST(req('http://localhost/api/change-orders', 'POST', { job_id: 'job-1', title: 'CO1', amount: 10 }) as any)

    // Should have multiple dashboard broadcasts, at least one per step that affects dashboard
    expect(calls.length).toBeGreaterThanOrEqual(6)
    const companyIds = new Set(calls.map(c => c.companyId))
    expect(companyIds.has('comp-1')).toBe(true)
  })
})
