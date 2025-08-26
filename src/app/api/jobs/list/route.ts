import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

// Cursor is base64("created_at|id") descending created_at then id
function enc(cur: { created_at: string; id: string }) {
  return Buffer.from(`${cur.created_at}|${cur.id}`).toString('base64')
}
function dec(raw: string | null) {
  if (!raw) return null
  try {
    const s = Buffer.from(raw, 'base64').toString('utf8')
    const [created_at, id] = s.split('|')
    if (!created_at || !id) return null
    return { created_at, id }
  } catch { return null }
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const url = new URL(req.url)
  const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(limitRaw, 1), 100)
  const cursor = dec(url.searchParams.get('cursor'))
  const sb = supabaseService()
  let q = sb.from('jobs')
    .select('id,name,code,created_at')
    .eq('company_id', session.companyId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)
  if (cursor) {
    // created_at desc => use lt
    q = q.lt('created_at', cursor.created_at)
  }
  const { data, error } = await q as any
  if (error) return NextResponse.json({ error: (error as any).message }, { status: 500 })
  const rows = (data || []) as any[]
  let nextCursor: string | null = null
  if (rows.length > limit) {
  const last = rows[limit - 1] as any
  nextCursor = enc({ created_at: String(last.created_at), id: String(last.id) })
  }
  return NextResponse.json({ items: rows.slice(0, limit), nextCursor })
}
