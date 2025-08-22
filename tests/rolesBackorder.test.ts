import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks & shared state
vi.mock('@/lib/realtime', () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
  broadcastExpenseUpdated: vi.fn().mockResolvedValue(undefined),
  broadcastDeliveryUpdated: vi.fn().mockResolvedValue(undefined),
  broadcastPoUpdated: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/storage', () => ({ uploadPrivateSigned: vi.fn().mockResolvedValue('https://signed/img.jpg') }))

// In-memory tables to emulate minimal subset
interface Row { id: string; [k: string]: any }
const tables: Record<string, Row[]> = {
  rfq_items: [{ id: 'ri-1', rfq_id: 'rfq-1', company_id: 'comp-1', qty: 10 }],
  pos: [{ id: 'po-1', company_id: 'comp-1', rfq_id: 'rfq-1', status: 'issued' }],
  deliveries: [],
  delivery_items: [],
}

function makeBuilder(table: string) {
  return {
    insert(row: any) {
      const stored = Array.isArray(row) ? row.map(r => ({ ...r, id: r.id || `${table}-${(tables[table]||[]).length+1}` })) : { ...row, id: row.id || `${table}-${(tables[table]||[]).length+1}` }
      if (Array.isArray(stored)) {
        tables[table] = tables[table] || []
        tables[table].push(...stored)
      } else {
        tables[table] = tables[table] || []
        tables[table].push(stored)
      }
      return {
        select() { return { single: async () => ({ data: Array.isArray(stored) ? stored[0] : stored, error: null }) } },
        async single() { return { data: Array.isArray(stored) ? stored[0] : stored, error: null } },
      }
    },
    select(_cols?: string) {
      const self: any = {
        _rows: [...(tables[table] || [])],
        eq(col: string, val: any) { self._rows = self._rows.filter((r: any) => r[col] === val); return self },
        in(col: string, vals: any[]) { self._rows = self._rows.filter((r: any) => vals.includes(r[col])); return self },
        order() { return self },
        limit() { return self },
        async single() { return { data: self._rows[0] || null, error: null } },
        async then() {},
      }
      return self
    },
    update(vals: any) { return { eq(_c: string, _v: any) { const row = (tables[table]||[]).find(r => true); if (row) Object.assign(row, vals); return { then() {} } } } },
    eq() { return this },
    order() { return this },
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseService: () => ({
    from(table: string) { return makeBuilder(table) },
    channel: () => ({ subscribe: (cb: any) => { cb('SUBSCRIBED'); return { send: async () => {}, unsubscribe: async () => {} } } }),
    storage: { listBuckets: async () => ({ data: [] }) },
  }),
  supabaseAnon: () => ({ channel: () => ({ on() { return this }, subscribe() { return { unsubscribe() {} } } }) }),
}))

// Helpers
function req(url: string, method: string, body: any, role?: string) {
  return new Request(url, { method, headers: { 'content-type': 'application/json', 'x-company-id': 'comp-1', ...(role ? { 'x-role': role } : {}) }, body: body ? JSON.stringify(body) : undefined })
}

// Import routes after mocks
import * as deliveriesRoute from '@/app/api/deliveries/route'

describe('Role enforcement & backorder logic', () => {
  beforeEach(() => {
    tables.deliveries.length = 0
    tables.delivery_items.length = 0
    const po = tables.pos[0]; po.status = 'issued'
  })

  it('denies delivery creation without sufficient role', async () => {
  const r = await deliveriesRoute.POST(req('http://localhost/api/deliveries','POST',{ job_id: 'job-1', po_id: 'po-1', items:[{ description:'Item', qty:5 }] }) as any)
    expect(r.status).toBe(401) // no role header
  })

  it('allows delivery creation with foreman and creates backorder placeholder when partial', async () => {
  const r = await deliveriesRoute.POST(req('http://localhost/api/deliveries','POST',{ job_id: 'job-1', po_id: 'po-1', items:[{ description:'Item', qty:5 }] }, 'foreman') as any)
    expect(r.status).toBe(200)
    // Should have original delivery + synthetic backorder
    const orig = tables.deliveries.find(d => d.notes == null)
    const back = tables.deliveries.find(d => typeof d.notes === 'string' && d.notes.startsWith('Backorder'))
    expect(orig).toBeTruthy()
    expect(back).toBeTruthy()
    // Remaining should be 5 (ordered 10 - delivered 5)
    expect(back?.notes).toContain('5')
  })

  it('auto-completes PO when delivered meets ordered and updates backorder status', async () => {
    // First partial (5)
  await deliveriesRoute.POST(req('http://localhost/api/deliveries','POST',{ job_id: 'job-1', po_id: 'po-1', items:[{ description:'Item', qty:5 }] }, 'foreman') as any)
    // Second delivers remaining 5
  const r2 = await deliveriesRoute.POST(req('http://localhost/api/deliveries','POST',{ job_id: 'job-1', po_id: 'po-1', items:[{ description:'Item', qty:5 }] }, 'foreman') as any)
    expect(r2.status).toBe(200)
    const po = tables.pos[0]
    expect(po.status).toBe('complete')
    // Backorder notes delivery should have been marked delivered (status updated)
    const back = tables.deliveries.find(d => typeof d.notes === 'string' && d.notes.startsWith('Backorder'))
    expect(back?.status).toBe('delivered')
  })
})
