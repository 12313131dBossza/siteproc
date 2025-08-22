import { describe, it, expect } from 'vitest'
import { expensesCsv, billsCsv } from '../src/lib/qb'

describe('QB CSV', () => {
  it('expensesCsv headers + row', () => {
    const csv = expensesCsv([{ spent_at: '2025-01-02', supplier_name: 'Acme', cost_code: '03100', amount: 123.45, memo: 'Bolts' }])
    expect(csv.split('\n')[0]).toContain('Date,Vendor,Account,Amount,Memo')
    expect(csv).toContain('2025-01-02')
  })

  it('billsCsv headers + row', () => {
    const csv = billsCsv([{ created_at: '2025-02-03T00:00:00Z', supplier_name: 'BoltCo', po_number: 'PO-000123', total: 77 }])
    expect(csv.split('\n')[0]).toContain('Bill Date,Vendor,Bill No,Amount')
    expect(csv).toContain('PO-000123')
  })
})
