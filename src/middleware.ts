import { NextResponse } from 'next/server'
import { config as appConfig } from '@/lib/config'
import crypto from 'crypto'
import { supabaseService } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

// Simple structured logger (stdout JSON)
function log(obj: Record<string, any>) {
  try { console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj })) } catch {}
}

// Persistent (DB-backed) rate limit & token attempts with in-memory fallback.
const memHits = new Map<string, { count: number; ts: number }>()
const memAttempts = new Map<string, { count: number; ts: number; lockedUntil?: number }>()

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
const MAX_HITS = Number(process.env.RATE_LIMIT_MAX || 20)

export async function middleware(req: any) {
  const response = NextResponse.next();
  const url = new URL(req.url);
  const path = url.pathname;

  const PUBLIC_PATHS = ['/login','/auth/callback'];
  const isPublicPath = PUBLIC_PATHS.includes(path) || path.startsWith('/api') || path.startsWith('/_next') || path === '/favicon.ico';

  // Supabase client with cookie passthrough
  let session: any = null;
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
  set: (name: string, value: string, options: any) => { try { req.cookies.set(name, value); (response as any).cookies.set({ name, value, ...options }); } catch {} },
  remove: (name: string, options: any) => { try { req.cookies.delete(name); (response as any).cookies.set({ name, value: '', ...options }); } catch {} }
      }
    });
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {}

  const isAuthed = !!session;
  if (path.startsWith('/dashboard') && !isAuthed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (path === '/login' && isAuthed) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Continue processing for non-public paths needing rate limiting below
  const isRateLimitedPublic = path.startsWith('/api/quotes/public/') || path.startsWith('/api/change-orders/public/');
  if (!isRateLimitedPublic) return response;

  const isPublic = path.startsWith('/api/quotes/public/') || path.startsWith('/api/change-orders/public/')
  if (!isRateLimitedPublic) return response

  // CORS allowlist for public endpoints
  const origin = req.headers.get('origin')
  let corsOk = true
  if (appConfig.corsOrigins.length) {
    corsOk = !!origin && appConfig.corsOrigins.includes(origin)
  }
  if (!corsOk) {
    log({ level: 'warn', event: 'cors_block', origin, path: url.pathname })
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Extract public token segment after /public/
  const parts = url.pathname.split('/')
  const pubIdx = parts.findIndex(p => p === 'public')
  const token = pubIdx >= 0 ? parts[pubIdx + 1] : ''
  if (token) {
    const now = Date.now()
    try {
      const sb = supabaseService()
  const { data } = await sb.from('token_attempts').select('*').eq('token', token).single() as any
  if (data?.locked_until && new Date(data.locked_until as any).getTime() > now) {
        return new NextResponse('Too Many Attempts', { status: 429 })
      }
    } catch {
      const tRec = memAttempts.get(token)
      if (tRec && tRec.lockedUntil && now < tRec.lockedUntil) return new NextResponse('Too Many Attempts', { status: 429 })
    }
  }

  const ip = req.headers.get('x-forwarded-for') || 'local'
  const key = `${ip}:${url.pathname}`
  const now = Date.now()
  let count = 0
  let windowStart = now
  let exceeded = false
  try {
    const sb = supabaseService()
    const { data } = await (sb.from('rate_limits').select('*').eq('key', key).single() as any)
    if (!data || now - new Date(data.window_start).getTime() > WINDOW_MS) {
  await (sb.from('rate_limits') as any).upsert({ key, window_start: new Date(now).toISOString(), count: 1 })
      count = 1
    } else {
      count = (data.count as number) + 1
      windowStart = new Date(data.window_start).getTime()
      if (count > MAX_HITS) exceeded = true
  else await (sb.from('rate_limits') as any).update({ count }).eq('key', key)
    }
  } catch {
    const rec = memHits.get(key)
    if (!rec || now - rec.ts > WINDOW_MS) {
      memHits.set(key, { count: 1, ts: now })
      count = 1
    } else {
      rec.count++
      count = rec.count
      if (rec.count > MAX_HITS) exceeded = true
    }
  }
  if (exceeded) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': String(Math.ceil(WINDOW_MS/1000)) } })
  }
  if (count === 1) {
  const res = response
    if (origin) res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Vary', 'Origin')
    if (appConfig.cspEnforce) {
      res.headers.set('Content-Security-Policy', `default-src 'none'; script-src ${appConfig.cspScriptSrc}; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'`)
    }
    res.headers.set('Referrer-Policy', 'no-referrer')
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
  // attach request id + log
  const reqId = crypto.randomUUID()
  res.headers.set('x-request-id', reqId)
  log({ level: 'info', event: 'public_req', path: url.pathname, phase: 'new-window', ip })
  return res
  }
  const res = NextResponse.next()
  if (origin) res.headers.set('Access-Control-Allow-Origin', origin)
  res.headers.set('Vary', 'Origin')
  if (appConfig.cspEnforce) {
    res.headers.set('Content-Security-Policy', `default-src 'none'; script-src ${appConfig.cspScriptSrc}; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'`)
  }
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  // Brute force accounting: if route signaled an attempt (header), increment counters.
  const attemptHeader = req.headers.get('x-token-attempt')
  if (attemptHeader && token) {
    const now2 = Date.now()
    try {
      const sb = supabaseService()
      const { data } = await sb.from('token_attempts').select('*').eq('token', token).single() as any
      if (!data || now2 - new Date(data.first_attempt_at as any).getTime() > appConfig.tokenLockMs) {
  await (sb.from('token_attempts') as any).upsert({ token, count: 1, first_attempt_at: new Date(now2).toISOString(), locked_until: null })
      } else {
        const newCount = (data.count as number) + 1
        let locked_until: string | null = null
        if (newCount >= appConfig.tokenMaxAttempts) locked_until = new Date(now2 + appConfig.tokenLockMs).toISOString()
  await (sb.from('token_attempts') as any).update({ count: newCount, locked_until }).eq('token', token)
        if (locked_until) log({ level: 'warn', event: 'token_locked', token, count: newCount })
      }
    } catch {
      const rec2 = memAttempts.get(token)
      if (!rec2 || now2 - rec2.ts > appConfig.tokenLockMs) {
        memAttempts.set(token, { count: 1, ts: now2 })
      } else {
        rec2.count++
        if (rec2.count >= appConfig.tokenMaxAttempts) {
          rec2.lockedUntil = now2 + appConfig.tokenLockMs
          log({ level: 'warn', event: 'token_locked', token, count: rec2.count })
        }
      }
    }
  }
  const reqId = crypto.randomUUID()
  res.headers.set('x-request-id', reqId)
  log({ level: 'info', event: 'public_req', path: url.pathname, phase: 'hit', ip })
  return res
}

export const config = { matcher: ['/((?!onboarding|api|_next|static|favicon.ico).*)'] }
