import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

// We treat quotes table as bids for admin view.
// Cursor: base64("created_at|id") descending created_at
function enc(created_at: string, id: string) { return Buffer.from(`${created_at}|${id}`).toString('base64') }
function dec(cur: string | null) {
  if (!cur) return null
  try { const [c,i] = Buffer.from(cur,'base64').toString('utf8').split('|'); if(!c||!i) return null; return { created_at:c, id:i } } catch { return null }
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const url = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit')||'50',10),1),100)
  const cursor = dec(url.searchParams.get('cursor'))
  const sb = supabaseService()
  let q = sb.from('quotes')
    .select('id,total,status,created_at')
    .eq('company_id', session.companyId)
    .order('created_at',{ ascending:false })
    .order('id',{ ascending:false })
    .limit(limit+1)
  if (cursor) q = q.lt('created_at', cursor.created_at)
  const { data, error } = await q as any
  if (error) return NextResponse.json({ error: (error as any).message }, { status: 500 })
  const rows = (data||[]) as any[]
  let nextCursor: string | null = null
  if (rows.length > limit) {
    const last = rows[limit-1] as any
    nextCursor = enc(String(last.created_at), String(last.id))
  }
  // Provide contractor, amount, status, submitted mapping expected by UI
  const items = rows.slice(0,limit).map(r => ({ id: r.id, contractor: null, amount: r.total, status: r.status, submitted: r.created_at }))
  return NextResponse.json({ items, nextCursor })
}
