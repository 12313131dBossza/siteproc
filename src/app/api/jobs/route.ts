import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'
import { broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

// POST /api/jobs - create new job (minimal fields) and broadcast dashboard update.
export async function POST(req: NextRequest) {
  const { companyId, actorId } = getIds(req)
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const name = (body?.name || '').trim()
  const code = (body?.code || '').trim()
  if (!name || name.length < 3) return NextResponse.json({ error: 'name >= 3 chars required' }, { status: 400 })
  if (code && code.length > 20) return NextResponse.json({ error: 'code too long' }, { status: 400 })
  const sb: any = supabaseService()
  const insert = { company_id: companyId, name, code: code || null, created_by: actorId || null }
  const { data, error } = await sb.from('jobs').insert(insert).select('id,name,code,created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await broadcastDashboardUpdated(companyId) } catch {}
  return NextResponse.json(data)
}