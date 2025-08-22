import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/rateLimitCore'

describe('rateLimitCore', () => {
  it('resets after window and enforces max hits deterministically', () => {
    const store = new Map<string, any>()
    const key = 'ip:/api/test'
    const windowMs = 1000
    const max = 3
    let now = 0
    // 1st hit
    let r = checkRateLimit(store, key, now, windowMs, max)
    expect(r.allowed).toBe(true)
    expect(r.count).toBe(1)
    // 2nd
    now += 10
    r = checkRateLimit(store, key, now, windowMs, max)
    expect(r.count).toBe(2)
    expect(r.allowed).toBe(true)
    // 3rd (edge)
    now += 10
    r = checkRateLimit(store, key, now, windowMs, max)
    expect(r.count).toBe(3)
    expect(r.allowed).toBe(true)
    // 4th (exceeds)
    now += 10
    r = checkRateLimit(store, key, now, windowMs, max)
    expect(r.count).toBe(4)
    expect(r.allowed).toBe(false)
    // Advance beyond window, should reset
    now += windowMs + 1
    r = checkRateLimit(store, key, now, windowMs, max)
    expect(r.count).toBe(1)
    expect(r.allowed).toBe(true)
  })
})
import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/rateLimitCore'

describe('rateLimitCore', () => {
  it('blocks after maxHits within window and resets after window', () => {
    const store = new Map()
    const key = 'ip:/api/test'
    const start = 1_000_000
    const windowMs = 1000
    const max = 3
    for (let i=1; i<=3; i++) {
      const r = checkRateLimit(store, key, start + i * 10, windowMs, max)
      expect(r.allowed).toBe(true)
      expect(r.count).toBe(i)
    }
    const denied = checkRateLimit(store, key, start + 50, windowMs, max)
    expect(denied.allowed).toBe(false)
    expect(denied.count).toBe(4)
    const after = checkRateLimit(store, key, start + windowMs + 10, windowMs, max)
    expect(after.allowed).toBe(true)
    expect(after.count).toBe(1)
  })
})
