import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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

  const { data, error } = await supabase
    .from('change_orders')
    .select('id, order_id, proposed_qty, reason, status, created_at')
    .eq('company_id', me.company_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
