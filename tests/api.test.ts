import { describe, it, expect, afterAll } from 'vitest'
import { z } from 'zod'
import { getIds, parseJson, appBaseUrl } from '@/lib/api'

describe('lib/api.ts helpers', () => {
  describe('getIds', () => {
    it('returns companyId and actorId when headers are present', () => {
      const req = new Request('http://localhost/test', {
        headers: {
          'x-company-id': 'acme-co',
          'x-actor-id': 'user-123',
        },
      })
      const ids = getIds(req)
      expect(ids).toEqual({ companyId: 'acme-co', actorId: 'user-123' })
    })

    it('throws Response 400 when x-company-id is missing', () => {
      const req = new Request('http://localhost/test')
      try {
        getIds(req)
        throw new Error('expected getIds to throw')
      } catch (e) {
        expect(e).toBeInstanceOf(Response)
        expect((e as Response).status).toBe(400)
      }
    })
  })

  describe('parseJson', () => {
    const schema = z.object({ name: z.string(), qty: z.number().int().positive() })

    it('parses valid JSON and validates with zod', async () => {
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'widget', qty: 3 }),
      })
      const data = await parseJson(req, schema)
      expect(data).toEqual({ name: 'widget', qty: 3 })
    })

    it('throws Response 400 on invalid JSON', async () => {
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not-json',
      })
      await expect(parseJson(req, schema)).rejects.toBeInstanceOf(Response)
      try {
        await parseJson(req, schema)
      } catch (e) {
        expect((e as Response).status).toBe(400)
      }
    })

    it('throws Response 400 when schema validation fails', async () => {
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'widget', qty: 'bad' }),
      })
      try {
        await parseJson(req, schema)
        throw new Error('expected parseJson to throw')
      } catch (e) {
        expect(e).toBeInstanceOf(Response)
        expect((e as Response).status).toBe(400)
      }
    })
  })

  describe('appBaseUrl', () => {
    const OLD = { ...process.env }

    it('returns APP_BASE_URL without trailing slash', () => {
      process.env.APP_BASE_URL = 'http://localhost:3000/'
      expect(appBaseUrl()).toBe('http://localhost:3000')
    })

    it('throws if APP_BASE_URL missing', () => {
      delete process.env.APP_BASE_URL
      expect(() => appBaseUrl()).toThrowError(/APP_BASE_URL missing/)
    })

    afterAll(() => {
      process.env = OLD
    })
  })
})
