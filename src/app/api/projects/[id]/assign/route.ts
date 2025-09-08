import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseService } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const { orders = [], expenses = [], deliveries = [] } = body as { orders?: string[]; expenses?: string[]; deliveries?: string[] }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )

  const me = await supabase.auth.getUser()
  const uid = me.data.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const prof = await supabase.from('profiles').select('company_id, role').eq('id', uid as any).single()
  const myCompany = (prof.data as any)?.company_id
  if (!myCompany) return NextResponse.json({ error: 'no_company' }, { status: 400 })

  const sb = supabaseService()
  const project = await sb.from('projects').select('id, company_id, status').eq('id', params.id).single()
  if (project.error || !project.data) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
  if ((project.data as any).company_id !== myCompany) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if ((project.data as any).status === 'closed') return NextResponse.json({ error: 'project_closed' }, { status: 400 })

  const ensureCompany = async (table: 'orders'|'expenses'|'deliveries', ids: string[]) => {
    if (!ids?.length) return { ok: true }
    const { data, error } = await sb.from(table).select('id, company_id').in('id', ids)
    if (error) return { ok: false, error: error.message }
    for (const r of data || []) {
      if ((r as any).company_id !== myCompany) return { ok: false, error: `cross_company_${table}` }
    }
    return { ok: true }
  }

  for (const [table, ids] of [['orders', orders], ['expenses', expenses], ['deliveries', deliveries]] as const) {
    const check = await ensureCompany(table, ids)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
  }

  // Perform updates (service role after validation)
  const updates: Array<Promise<any>> = []
  if (orders.length) updates.push(sb.from('orders').update({ project_id: params.id }).in('id', orders))
  if (expenses.length) updates.push(sb.from('expenses').update({ project_id: params.id }).in('id', expenses))
  if (deliveries.length) updates.push(sb.from('deliveries').update({ project_id: params.id }).in('id', deliveries))

  const results = await Promise.all(updates)
  for (const r of results) { if ((r as any)?.error) return NextResponse.json({ error: (r as any).error.message }, { status: 400 }) }

  return NextResponse.json({ ok: true })
}
