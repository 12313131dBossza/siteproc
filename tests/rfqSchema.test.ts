import { describe, it, expect } from 'vitest'
import { rfqCreateSchema } from '../src/lib/validation'

const uuid = '00000000-0000-4000-8000-000000000000'

describe('rfqCreateSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = rfqCreateSchema.safeParse({
      job_id: uuid,
      title: 'Test RFQ',
      needed_date: '2030-01-01',
      items: [{ description: 'Bolts', qty: 10, unit: 'ea', sku: 'B-10' }],
    })
    expect(parsed.success).toBe(true)
  })

  it('requires at least one item', () => {
    const parsed = rfqCreateSchema.safeParse({ job_id: uuid, items: [] })
    expect(parsed.success).toBe(false)
  })

  it('rejects non-uuid job_id', () => {
    const parsed = rfqCreateSchema.safeParse({ job_id: 'not-a-uuid', items: [{ description: 'x', qty: 1 }] })
    expect(parsed.success).toBe(false)
  })
})
