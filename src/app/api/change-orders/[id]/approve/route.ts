import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-service'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const coId = params.id

  const { data: co, error: coErr } = await supabase
    .from('change_orders')
    .select('id, order_id, job_id, cost_delta, status, company_id, created_by')
    .eq('id', coId)
    .single()
  if (coErr || !co) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (co.status !== 'pending') return NextResponse.json({ error: 'already_decided' }, { status: 400 })

  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Get user's email for approver_email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', uid)
    .single()

  // Approve the change order
  const up = await supabase
    .from('change_orders')
    .update({ 
      status: 'approved', 
      approved_at: new Date().toISOString(),
      approver_email: profile?.email || null
    })
    .eq('id', co.id)
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 })

  // Update the order's cost if order_id exists
  if (co.order_id && co.cost_delta) {
    console.log('💰 Updating order cost for order_id:', co.order_id, 'cost_delta:', co.cost_delta)
    
    // Use service client to bypass RLS for the update
    const serviceSb = createServiceClient()
    
    // Get current order amount
    const { data: order, error: fetchError } = await serviceSb
      .from('purchase_orders')
      .select('amount')
      .eq('id', co.order_id)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch order:', fetchError)
    } else if (order) {
      const newAmount = (order.amount || 0) + co.cost_delta
      console.log('📊 Old amount:', order.amount, '→ New amount:', newAmount)
      
      const { error: updateError } = await serviceSb
        .from('purchase_orders')
        .update({ amount: newAmount })
        .eq('id', co.order_id)
      
      if (updateError) {
        console.error('❌ Failed to update order amount:', updateError)
      } else {
        console.log('✅ Successfully updated order amount')
      }
    }
  }

  return NextResponse.json({ ok: true })
}
