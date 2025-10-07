import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

// GET: List payments with pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
    const cursor = searchParams.get('cursor')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')

    const sb = supabaseService()
    let query = (sb as any)
      .from('payments')
      .select('*, projects(name), purchase_orders(id), expenses(id)')
      .eq('company_id', session.companyId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) query = query.lt('created_at', cursor)
    if (status) query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) {
      console.error('Payments fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items = (data || []) as any[]
    let nextCursor: string | null = null

    if (items.length > limit) {
      const extra = items.pop()
      nextCursor = items[items.length - 1]?.created_at || extra?.created_at || null
    }

    return NextResponse.json({ items, nextCursor })
  } catch (e: any) {
    console.error('GET /api/payments error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

// POST: Create new payment
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })

    // Only Admin or Accountant can create payments
    enforceRole('accountant', session)

    const body = await req.json()
    const { 
      project_id, 
      order_id, 
      expense_id, 
      vendor_name, 
      amount, 
      payment_date, 
      payment_method, 
      reference_number, 
      notes, 
      status 
    } = body

    // Validation
    if (!vendor_name) {
      return NextResponse.json({ error: 'vendor_name is required' }, { status: 400 })
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }

    const sb = supabaseService()

    // Create payment
    const { data: payment, error } = await (sb as any)
      .from('payments')
      .insert({
        company_id: session.companyId,
        project_id: project_id || null,
        order_id: order_id || null,
        expense_id: expense_id || null,
        vendor_name,
        amount: parseFloat(amount),
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'check',
        reference_number: reference_number || null,
        notes: notes || null,
        status: status || 'unpaid',
        created_by: session.user.id,
      })
      .select('*')
      .single()

    if (error || !payment) {
      console.error('Payment creation error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to create payment' }, { status: 500 })
    }

    // Log activity
    await audit(
      session.companyId,
      session.user.id,
      'payment',
      payment.id,
      'create',
      { vendor_name, amount, status: payment.status }
    )

    // Broadcast update
    await broadcastDashboardUpdated(session.companyId)

    return NextResponse.json({ ok: true, data: payment }, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/payments error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
