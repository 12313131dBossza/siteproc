import { describe, it, expect } from 'vitest'
import { getPublicTokenHeader } from '../src/lib/tokens'

describe('tokens', () => {
  it('reads x-public-token', () => {
    const req = new Request('http://x', { headers: { 'x-public-token': 'abc' } })
    expect(getPublicTokenHeader(req)).toBe('abc')
  })
})
