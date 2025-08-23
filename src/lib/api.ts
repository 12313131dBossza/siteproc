import { ZodSchema } from 'zod'

export function getIds(req: Request) {
  const companyId = req.headers.get('x-company-id') || ''
  const actorId = req.headers.get('x-actor-id')
  const role = req.headers.get('x-role') || ''
  if (!companyId) throw new Response('Missing x-company-id header', { status: 400 })
  return { companyId, actorId, role }
}

const ROLE_ORDER = ['foreman','bookkeeper','admin','owner'] as const
type Role = typeof ROLE_ORDER[number]

// Returns true if role meets minimum, false otherwise (never throws now).
export function hasRole(role: string | undefined, minimum: Role): boolean {
  const idx = ROLE_ORDER.indexOf(minimum)
  if (!role) return false
  const actualIdx = ROLE_ORDER.indexOf(role as Role)
  if (actualIdx === -1) return false
  return actualIdx >= idx
}

// Backwards-compatible helper name; now returns boolean (no throw).
export function requireRole(role: string | undefined, minimum: Role) {
  const idx = ROLE_ORDER.indexOf(minimum)
  if (!role) throw new Response('Auth required', { status: 401 })
  const actualIdx = ROLE_ORDER.indexOf(role as Role)
  if (actualIdx === -1 || actualIdx < idx) {
    throw new Response('Forbidden', { status: 403 })
  }
}

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json().catch(() => null)
  if (!body) throw new Response('Invalid JSON', { status: 400 })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new Response(JSON.stringify(parsed.error.format()), { status: 400 })
  }
  return parsed.data
}

export function appBaseUrl() {
  const base = process.env.APP_BASE_URL
  if (!base) throw new Error('APP_BASE_URL missing')
  return base.replace(/\/$/, '')
}
