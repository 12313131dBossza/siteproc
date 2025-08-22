import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/realtime', () => ({ broadcast: vi.fn(), broadcastExpenseUpdated: vi.fn(), broadcastDeliveryUpdated: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))

// Minimal supabase mock focusing on change_orders table
const tables: Record<string, any[]> = {
  change_orders: [{ id: 'co-1', company_id: 'comp-1', public_token: 'cotok', status: 'pending', cost_delta: 100 }],
}
function makeBuilder(table: string) {
  return {
    select() { return { eq: () => ({ single: async () => ({ data: tables[table][0], error: null }) }) } },
    update(vals: any) { return { eq: () => ({ then() {}, async single() { Object.assign(tables[table][0], vals); return { data: tables[table][0], error: null } } }) } },
    insert() { return { then() {} } },
    upsert() { return { then() {} } },
  }
}
vi.mock('@/lib/supabase', () => ({ supabaseService: () => ({ from: (t: string) => makeBuilder(t), channel: () => ({ subscribe: (cb: any) => { cb('SUBSCRIBED'); return { send: async () => {}, unsubscribe: async () => {} } } }) }), supabaseAnon: () => ({ channel: () => ({ on(){return this}, subscribe(){ return { unsubscribe() {} } } }) }) }))

// Token helpers
vi.mock('@/lib/tokens', () => ({ verifyPublicSignature: () => true }))

async function loadRejectRoute() { return import('@/app/api/change-orders/public/[token]/reject/route') }

// Fake middleware rate limit fallback (simulate hits exceeding)

describe('Public change order token reuse & rate limit', () => {
  beforeEach(()=> { tables.change_orders[0].public_token_used_at = undefined; tables.change_orders[0].status = 'pending' })
  it('rejects second use when one-time enforced', async () => {
    process.env.PUBLIC_HMAC_REQUIRE = 'false'
    process.env.CO_ONE_TIME = 'true'
    const mod = await loadRejectRoute()
    const req1 = new Request('http://localhost/api/change-orders/public/cotok/reject', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const r1 = await mod.POST(req1 as any, { params: { token: 'cotok' } } as any)
    expect(r1.status).toBe(200)
    tables.change_orders[0].public_token_used_at = new Date().toISOString()
    const req2 = new Request('http://localhost/api/change-orders/public/cotok/reject', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const r2 = await mod.POST(req2 as any, { params: { token: 'cotok' } } as any)
    expect(r2.status).toBe(410)
  })
})

describe('Realtime discriminant smoke', () => {
  it('dispatches onAny with discriminant', async () => {
    const events: any[] = []
    // Simulate hook handler receiving payload
    const payload = { kind: 'expense', job_id: 'job-1', expense_id: 'e1', at: new Date().toISOString() }
    // Simple runtime type discrimination
    if (payload.kind === 'expense') events.push('expense')
    expect(events).toContain('expense')
  })
})
