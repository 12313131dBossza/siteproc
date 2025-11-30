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
  const projectRes: any = await (sb as any).from('projects').select('id, company_id, status').eq('id', params.id).single()
  if (projectRes.error || !projectRes.data) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
  if ((projectRes.data as any).company_id !== myCompany) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if ((projectRes.data as any).status === 'completed' || (projectRes.data as any).status === 'cancelled') return NextResponse.json({ error: 'project_closed' }, { status: 400 })

  const ensureCompany = async (table: 'orders'|'expenses'|'deliveries', ids: string[]) => {
    if (!ids?.length) return { ok: true }
    const { data, error } = await sb.from(table).select('id, company_id').in('id', ids)
    if (error) return { ok: false, error: error.message }
    for (const r of data || []) {
      const cid = (r as any).company_id
      // Allow assignment if company_id is null (legacy rows) or matches myCompany
      if (cid && cid !== myCompany) return { ok: false, error: `cross_company_${table}` }
    }
    return { ok: true }
  }

  for (const [table, ids] of [['orders', orders], ['expenses', expenses], ['deliveries', deliveries]] as const) {
    const check = await ensureCompany(table, ids)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
  }

  // Perform updates (service role after validation)
  const updates: Array<Promise<any>> = []
  // For orders, also set company_id if it's currently null. If the column doesn't exist, fall back to only project_id.
  if (orders.length) {
    const upd = (sb as any)
      .from('orders')
      .update({ project_id: params.id, company_id: myCompany })
      .in('id', orders)
      .then((r: any) => r)
    updates.push(upd)
  }
  if (expenses.length) updates.push(((sb as any).from('expenses').update({ project_id: params.id }).in('id', expenses) as any).then((r: any)=>r))
  if (deliveries.length) updates.push(((sb as any).from('deliveries').update({ project_id: params.id }).in('id', deliveries) as any).then((r: any)=>r))

  let results: any[] = await Promise.all(updates)
  // If orders update failed due to missing company_id column, retry without setting company_id
  if (orders.length && results[0]?.error && /company_id/.test(results[0].error.message || '')) {
    const retry = await (sb as any).from('orders').update({ project_id: params.id }).in('id', orders)
    results[0] = retry
  }
  for (const r of results) { if ((r as any)?.error) return NextResponse.json({ error: (r as any).error.message }, { status: 400 }) }

  return NextResponse.json({ ok: true })
}
