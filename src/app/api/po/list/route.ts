import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

// Cursor encoded as base64 of `${created_at}|${id}` descending order
function encodeCursor(created_at: string, id: string) {
  return Buffer.from(`${created_at}|${id}`).toString('base64')
}
function decodeCursor(cur: string | null) {
  if (!cur) return null
  try {
    const raw = Buffer.from(cur, 'base64').toString('utf8')
    const [created_at, id] = raw.split('|')
    if (!created_at || !id) return null
    return { created_at, id }
  } catch { return null }
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
  const url = new URL(req.url)
  const limitRaw = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(limitRaw, 1), 50)
  const cursor = decodeCursor(url.searchParams.get('cursor'))
  const sb = supabaseService()

  let query = sb.from('pos')
    .select('id,po_number,status,total,created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('created_at', cursor.created_at)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data || []) as any[]
  let nextCursor: string | null = null
  if (items.length > limit) {
    const last: any = items[limit - 1]
    nextCursor = encodeCursor(String(last.created_at), String(last.id))
  }
  return NextResponse.json({ items: items.slice(0, limit), nextCursor })
}
