import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks
vi.mock('@/lib/realtime', () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
  broadcastExpenseUpdated: vi.fn().mockResolvedValue(undefined),
  broadcastDeliveryUpdated: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/storage', () => ({ uploadPrivateSigned: vi.fn().mockResolvedValue('https://signed.example/img.jpg') }))

// Dynamic supabase mock that can record inserts
interface InsertCall { table: string; row: any }
const insertCalls: InsertCall[] = []

vi.mock('@/lib/supabase', () => {
  function makeBuilder(table: string) {
    return {
      insert(row: any) {
        insertCalls.push({ table, row })
        return {
          select(_sel: string) {
            return {
              async single() {
                if (table === 'expenses') return { data: { id: 'exp-1', job_id: row.job_id }, error: null }
                if (table === 'deliveries') return { data: { id: 'deliv-1', job_id: row.job_id }, error: null }
                if (table === 'cost_codes') return { data: { id: 'cc-1', job_id: row.job_id || null }, error: null }
                if (table === 'pos') return { data: { id: 'po-1' }, error: null }
                return { data: { id: 'generic-1' }, error: null }
              },
            }
          },
          async single() { // some code paths might call .insert(...).single() directly
            return { data: { id: `${table}-1` }, error: null }
          },
        }
      },
      select(_sel: string) {
        return {
          eq() { return this },
          order() { return this },
          async single() { return { data: { id: `${table}-row`, job_id: 'job-1' }, error: null } },
          async then() { /* ignore */ },
        }
      },
      update(_vals: any) { return { eq() { return { then() {} } } } },
      eq() { return this },
      order() { return this },
    }
  }
  return {
    supabaseService: () => ({
      from(table: string) { return makeBuilder(table) },
      storage: { listBuckets: async () => ({ data: [] }), createBucket: async () => ({}) },
      channel: () => ({ subscribe: (cb: any) => { cb('SUBSCRIBED'); return { send: async () => {}, unsubscribe: async () => {} } } }),
    }),
  }
})

// Helpers
function makeReq(method: string, body: any) {
  return new Request('http://localhost/api/test', {
    method,
    headers: { 'content-type': 'application/json', 'x-company-id': 'comp-1' },
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

// Import after mocks
import * as expensesRoute from '@/app/api/expenses/route'
import * as deliveriesRoute from '@/app/api/deliveries/route'
import * as costCodesRoute from '@/app/api/cost-codes/route'
import * as expenseReceiptRoute from '@/app/api/expenses/[id]/receipt/route'
import * as deliveryDeliverRoute from '@/app/api/deliveries/[id]/deliver/route'
import * as deliveryPhotosRoute from '@/app/api/deliveries/[id]/photos/route'

beforeEach(() => { insertCalls.length = 0 })

describe('API route POST handlers', () => {
  it('creates expense (POST /api/expenses)', async () => {
    const req = makeReq('POST', { job_id: '00000000-0000-4000-8000-000000000001', amount: 10, spent_at: '2030-01-01' })
    const res = await expensesRoute.POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('exp-1')
    expect(insertCalls.some(c => c.table === 'expenses')).toBe(true)
  })

  it('rejects invalid expense (negative amount)', async () => {
    const req = makeReq('POST', { job_id: '00000000-0000-4000-8000-000000000001', amount: -5, spent_at: '2030-01-01' })
    const res = await expensesRoute.POST(req as any)
    expect(res.status).toBe(400)
  })

  it('creates delivery (POST /api/deliveries)', async () => {
    const payload = { job_id: '00000000-0000-4000-8000-000000000002', items: [{ description: 'Box', qty: 1 }] }
    const req = makeReq('POST', payload)
    const res = await deliveriesRoute.POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('deliv-1')
    expect(insertCalls.some(c => c.table === 'deliveries')).toBe(true)
  })

  it('rejects delivery with no items', async () => {
    const payload = { job_id: '00000000-0000-4000-8000-000000000002', items: [] }
    const req = makeReq('POST', payload)
    const res = await deliveriesRoute.POST(req as any)
    expect(res.status).toBe(400)
  })

  it('creates cost code (POST /api/cost-codes)', async () => {
    const payload = { code: '03100', description: 'Concrete' }
    const req = makeReq('POST', payload)
    const res = await costCodesRoute.POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('cc-1')
  })

  it('uploads expense receipt', async () => {
    const req = new Request('http://localhost/api/expenses/exp-1/receipt', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-company-id': 'comp-1' },
      body: JSON.stringify({ receipt_data_url: 'data:image/png;base64,AAAA' }),
    })
    const res = await expenseReceiptRoute.POST(req as any, { params: { id: 'exp-1' } } as any)
    expect(res.status).toBe(200)
  })

  it('marks delivery delivered', async () => {
    const req = new Request('http://localhost/api/deliveries/deliv-1/deliver', {
      method: 'POST',
      headers: { 'x-company-id': 'comp-1' },
    })
    const res = await deliveryDeliverRoute.POST(req as any, { params: { id: 'deliv-1' } } as any)
    expect(res.status).toBe(200)
  })

  it('adds delivery photos', async () => {
    const req = new Request('http://localhost/api/deliveries/deliv-1/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-company-id': 'comp-1' },
      body: JSON.stringify({ photo_data_urls: ['data:image/jpeg;base64,AAAA'] }),
    })
    const res = await deliveryPhotosRoute.POST(req as any, { params: { id: 'deliv-1' } } as any)
    expect(res.status).toBe(200)
  })

  it('paginates expenses list', async () => {
    // Call GET with limit param
    const req = new Request('http://localhost/api/expenses?job_id=job-1&limit=1', { headers: { 'x-company-id': 'comp-1' } })
    const mod = await import('@/app/api/expenses/route')
    const res = await mod.GET(req as any)
    const json = await res.json()
    expect(json).toHaveProperty('items')
    expect(Array.isArray(json.items)).toBe(true)
  // nextCursor may be null/undefined if only 1 row; just assert property exists
  expect(json).toHaveProperty('nextCursor')
  })

  it('paginates deliveries list', async () => {
    const req = new Request('http://localhost/api/deliveries?job_id=job-1&limit=1', { headers: { 'x-company-id': 'comp-1' } })
    const mod = await import('@/app/api/deliveries/route')
    const res = await mod.GET(req as any)
    const json = await res.json()
    expect(json).toHaveProperty('items')
    expect(Array.isArray(json.items)).toBe(true)
  expect(json).toHaveProperty('nextCursor')
  })
})
