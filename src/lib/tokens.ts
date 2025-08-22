import crypto from 'crypto'
import { config } from './config'
import { supabaseService } from './supabase'

// Nonce persistence: try DB (nonce_replay table) else fall back to in-memory map.
// Expected table (create manually if not exist):
// create table if not exists public.nonce_replay (nonce text primary key, seen_at timestamptz not null default now());
const seenNonces = new Map<string, number>() // fallback
const NONCE_TTL_MS = 60 * 60 * 1000

function recordNonce(nonce: string, now: number): boolean {
  try {
    const sb = supabaseService()
  // Fire and forget insert (best-effort). Using then chain to avoid making caller async.
  sb.from('nonce_replay').insert({ nonce, seen_at: new Date(now).toISOString() }) as any
  return true // cannot easily detect unique violation synchronously
  } catch {
    // fallback to memory
    for (const [k, ts] of seenNonces) {
      if (now - ts > NONCE_TTL_MS) seenNonces.delete(k)
    }
    if (seenNonces.has(nonce)) return false
    seenNonces.set(nonce, now)
    return true
  }
}

export interface SignedEnvelope<T extends Record<string, any>> {
  payload: T & { ts?: number; nonce?: string }
  signature: string
}

function computeSig(obj: any) {
  return crypto.createHmac('sha256', config.hmacSecret).update(JSON.stringify(obj)).digest('hex')
}

export function signPublicPayload<T extends Record<string, any>>(payload: T, opts?: { includeTs?: boolean; includeNonce?: boolean }): SignedEnvelope<T> {
  if (!config.hmacSecret) throw new Error('PUBLIC_HMAC_SECRET not set')
  const enriched: any = { ...payload }
  if (opts?.includeTs) enriched.ts = Date.now()
  if (opts?.includeNonce) enriched.nonce = crypto.randomBytes(12).toString('hex')
  return { payload: enriched, signature: computeSig(enriched) }
}

export interface VerifyOptions { requireTs?: boolean; maxDriftMs?: number; requireNonce?: boolean }

export function verifyPublicSignature(payload: any, signature: string | undefined, opt?: VerifyOptions): boolean {
  if (!config.hmacSecret) return false
  if (!signature) return false
  try {
    const expected = computeSig(payload)
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false
    const now = Date.now()
    if (opt?.requireTs || config.hmacEnforceTs) {
      const ts = payload.ts
      if (typeof ts !== 'number') return false
      const drift = Math.abs(now - ts)
      const limit = opt?.maxDriftMs ?? config.hmacMaxDriftMs
      if (drift > limit) return false
    }
    if (opt?.requireNonce) {
      const nonce = payload.nonce
      if (!nonce || typeof nonce !== 'string') return false
  const ok = recordNonce(nonce, now)
      if (!ok) return false
    }
    return true
  } catch {
    return false
  }
}

export function getPublicTokenHeader(req: Request): string | null {
  return req.headers.get('x-public-token')
}
