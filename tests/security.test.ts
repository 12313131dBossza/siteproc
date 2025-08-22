import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/realtime', () => ({ broadcast: vi.fn(), broadcastExpenseUpdated: vi.fn(), broadcastDeliveryUpdated: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/storage', () => ({ uploadPrivateSigned: vi.fn().mockResolvedValue('https://signed/img.jpg') }))

interface Row { id: string; [k: string]: any }
const tables: Record<string, Row[]> = {
  rfqs: [{ id: 'rfq-1', company_id: 'comp-1', public_token: 'pubtoken123' }],
  change_orders: [{ id: 'co-1', company_id: 'comp-1', public_token: 'cotoken123', status: 'pending' }],
  quotes: [],
  expenses: [{ id: 'exp-1', job_id: 'job-1', company_id: 'comp-1' }],
  deliveries: [{ id: 'deliv-1', job_id: 'job-1', company_id: 'comp-1' }],
}

function makeBuilder(table: string) {
  return {
    insert(row: any) {
      const id = row.id || `${table}-${tables[table]?.length || 0}`
      const stored = { ...row, id }
      tables[table] = tables[table] || []
      tables[table].push(stored)
      return {
        select() { return { single: async () => ({ data: { id }, error: null }) } },
        single: async () => ({ data: { id }, error: null }),
      }
    },
    select() {
      const self: any = {
        _rows: tables[table] || [],
        eq(_col: string, val: any) { self._rows = self._rows.filter((r: any) => Object.values(r).includes(val)); return self },
        order() { return self },
        async single() { return { data: self._rows[0] || null, error: null } },
      }
      return self
    },
    update(vals: any) { return { eq(_c: string, _v: any) { Object.assign((tables[table]||[])[0] || {}, vals); return { then() {} } } } },
    eq() { return this },
    order() { return this },
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseService: () => ({
    from(table: string) { return makeBuilder(table) },
    storage: { listBuckets: async () => ({ data: [] }) },
    channel: () => ({ subscribe: (cb: any) => { cb('SUBSCRIBED'); return { send: async () => {}, unsubscribe: async () => {} } } }),
  }),
  supabaseAnon: () => ({ channel: () => ({ on() { return this }, subscribe() { return { unsubscribe() {} } } }) }),
}))

async function loadQuotesRoute(env: Record<string,string>) {
  Object.assign(process.env, env)
  vi.resetModules()
  const mod = await import('@/app/api/quotes/public/[token]/route')
  const tokens = await import('@/lib/tokens')
  return { route: mod, tokens }
}

describe('Public endpoint security', () => {
  beforeEach(() => { vi.resetModules() })

  it('accepts valid signed quote submission', async () => {
    const { route, tokens } = await loadQuotesRoute({ PUBLIC_HMAC_SECRET: 'secret', PUBLIC_HMAC_REQUIRE: 'true' })
    const payload = { total: 10, lead_time: '1w', terms: 'net30', notes: 'ok' }
    const { payload: pl, signature } = tokens.signPublicPayload(payload, { includeTs: true, includeNonce: true })
    const req = new Request('http://localhost/api/quotes/public/pubtoken123', { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': signature }, body: JSON.stringify(pl) })
    const res = await route.POST(req as any, { params: { token: 'pubtoken123' } } as any)
    expect(res.status).toBe(200)
  })

  it('rejects bad signature', async () => {
    const { route, tokens } = await loadQuotesRoute({ PUBLIC_HMAC_SECRET: 'secret', PUBLIC_HMAC_REQUIRE: 'true' })
    const payload = { total: 10 }
    const { payload: pl } = tokens.signPublicPayload(payload, { includeTs: true, includeNonce: true })
    const req = new Request('http://localhost/api/quotes/public/pubtoken123', { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': 'deadbeef' }, body: JSON.stringify(pl) })
    const res = await route.POST(req as any, { params: { token: 'pubtoken123' } } as any)
    expect(res.status).toBe(401)
  })

  it('rejects replay (nonce reused)', async () => {
    const { route, tokens } = await loadQuotesRoute({ PUBLIC_HMAC_SECRET: 'secret', PUBLIC_HMAC_REQUIRE: 'true' })
    const { payload: pl, signature } = tokens.signPublicPayload({ total: 5 }, { includeTs: true, includeNonce: true })
    const req1 = new Request('http://localhost/api/quotes/public/pubtoken123', { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': signature }, body: JSON.stringify(pl) })
    const r1 = await route.POST(req1 as any, { params: { token: 'pubtoken123' } } as any)
    expect(r1.status).toBe(200)
    const req2 = new Request('http://localhost/api/quotes/public/pubtoken123', { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': signature }, body: JSON.stringify(pl) })
    const r2 = await route.POST(req2 as any, { params: { token: 'pubtoken123' } } as any)
    expect(r2.status).toBe(401)
  })
})

describe('Image validation failures', () => {
  it('rejects unsupported mime on receipt upload', async () => {
    vi.resetModules()
    const route = await import('@/app/api/expenses/[id]/receipt/route')
    const req = new Request('http://localhost/api/expenses/exp-1/receipt', { method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': 'comp-1' }, body: JSON.stringify({ receipt_data_url: 'data:image/gif;base64,AAAA' }) })
    const res = await route.POST(req as any, { params: { id: 'exp-1' } } as any)
    expect(res.status).toBe(400)
  })
})
