import { describe, it, expect } from 'vitest'

function mockNextPoNumber(last: number) {
  const next = last + 1
  const po = 'PO-' + String(next).padStart(6, '0')
  return po
}

describe('next_po_number', () => {
  it('increments and pads', () => {
    expect(mockNextPoNumber(0)).toBe('PO-000001')
    expect(mockNextPoNumber(122)).toBe('PO-000123')
  })
})
