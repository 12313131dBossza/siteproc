import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const includeHistory = searchParams.get('include_history') === 'true'
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )

  const meRes = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id as any)
    .single()
  const me = meRes.data as any
  if (!me || !['admin', 'owner'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('change_orders')
    .select(`
      id, order_id, proposed_qty, reason, description, status, 
      created_at, decided_by, decided_at, created_by
    `)
    .eq('company_id', me.company_id)
    .order('created_at', { ascending: false })

  // If not including history, only show pending
  if (!includeHistory) {
    query = query.eq('status', 'pending')
  } else {
    // Limit history to last 50 items to avoid overwhelming UI
    query = query.limit(50)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
