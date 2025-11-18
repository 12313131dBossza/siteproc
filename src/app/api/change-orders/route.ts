import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  // If orderId provided, filter by it (for specific order)
  if (orderId) {
    const { data, error } = await supabase
      .from('change_orders')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  }

  // Otherwise, return all change orders for the company
  const { data, error } = await supabase
    .from('change_orders')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const body = await req.json().catch(() => ({}))
  const { order_id, proposed_qty, reason } = body as { order_id?: string; proposed_qty?: number; reason?: string }

  if (!order_id || !proposed_qty || proposed_qty <= 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  // Authenticated user and their company
  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const profRes = await supabase.from('profiles').select('company_id, role').eq('id', uid as any).single()
  const myCompany = (profRes.data as any)?.company_id as string | undefined
  if (!myCompany) return NextResponse.json({ error: 'no_company' }, { status: 400 })

  // Try to read order using SSR (RLS). If not visible, fall back to service-role read; if still not found, let FK validate on insert.
  let orderRow: any | null = null
  const ssr = await supabase.from('orders').select('id, company_id, status').eq('id', order_id).single() as any
  if (!ssr.error && ssr.data) orderRow = ssr.data
  if (!orderRow) {
    const sb = supabaseService()
    const svc = await sb.from('orders').select('id, company_id, status').eq('id', order_id).single() as any
    if (!svc.error && svc.data) orderRow = svc.data
  }

  if (orderRow) {
    if (orderRow.company_id !== myCompany) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!['approved', 'partially_delivered'].includes(orderRow.status)) {
      return NextResponse.json({ error: 'invalid_order_state' }, { status: 400 })
    }
  }

  // Insert under RLS with the authenticated user
  const payload = {
    order_id,
    proposed_qty,
    reason: reason ?? null,
    status: 'pending' as const,
    created_by: uid,
    company_id: myCompany,
  }

  const { data: co, error } = await supabase
    .from('change_orders')
    .insert(payload)
    .select('*')
    .single()
  if (error) {
    const msg = String(error.message || '')
    
    // If legacy schema requires description instead of reason
    if (/description/gi.test(msg) && /not-null|null value/i.test(msg)) {
      const retry: any = { ...payload, description: reason || 'Change request' }
      delete retry.reason
      const again = await supabase.from('change_orders').insert(retry).select('*').single()
      if (!again.error && again.data) return NextResponse.json({ data: again.data })
      return NextResponse.json({ error: again.error?.message || 'insert_failed' }, { status: 400 })
    }
    
    // If a legacy schema requires job_id NOT NULL, retry by mapping order_id to job_id
    if (/job_id/gi.test(msg) && /not-null|null value/i.test(msg)) {
      const retry: any = { ...payload, job_id: order_id }
      const again = await supabase.from('change_orders').insert(retry).select('*').single()
      if (!again.error && again.data) return NextResponse.json({ data: again.data })
      return NextResponse.json({ error: again.error?.message || 'insert_failed' }, { status: 400 })
    }
    
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data: co })
}
