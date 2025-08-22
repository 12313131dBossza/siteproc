import { describe, it, expect } from 'vitest'
import { EVENTS } from '@/lib/constants'
import { isJobEventPayload } from '@/lib/useJobRealtime'

describe('job events', () => {
  it('exposes expected event keys', () => {
    expect(EVENTS.JOB_EXPENSE_UPDATED).toBe('job-expense-updated')
    expect(EVENTS.JOB_DELIVERY_UPDATED).toBe('job-delivery-updated')
    expect(EVENTS.JOB_COST_CODE_UPDATED).toBe('job-cost-code-updated')
    expect(EVENTS.JOB_PO_UPDATED).toBe('job-po-updated')
    expect(EVENTS.JOB_CHANGE_ORDER_UPDATED).toBe('job-change-order-updated')
  })
  it('type guard works', () => {
    const good = { kind: 'expense', job_id: '1', expense_id: '2', at: new Date().toISOString() }
    const bad = { foo: 'bar' }
    expect(isJobEventPayload(good)).toBe(true)
    expect(isJobEventPayload(bad)).toBe(false)
  })
})
import { describe, it, expect } from 'vitest'
import { isJobEventPayload } from '@/lib/jobEvents'

describe('jobEvents type guard', () => {
  it('accepts known shapes', () => {
    const samples = [
      { kind: 'expense', job_id: 'j', expense_id: 'e', at: '2025-01-01' },
      { kind: 'delivery', job_id: 'j', delivery_id: 'd', at: '2025-01-01' },
      { kind: 'cost_code', job_id: 'j', cost_code_id: 'c', at: '2025-01-01' },
      { kind: 'po', job_id: 'j', po_id: 'p', at: '2025-01-01' },
      { kind: 'change_order', job_id: 'j', change_order_id: 'co', at: '2025-01-01' },
    ]
    for (const s of samples) expect(isJobEventPayload(s)).toBe(true)
  })
  it('rejects invalid', () => {
    expect(isJobEventPayload(null)).toBe(false)
    expect(isJobEventPayload({})).toBe(false)
    expect(isJobEventPayload({ kind: 'expense' })).toBe(false)
  })
})
