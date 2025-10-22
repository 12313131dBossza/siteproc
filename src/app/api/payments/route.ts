import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

export const runtime = 'nodejs'

// GET: List payments with pagination
export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id and role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
    const cursor = searchParams.get('cursor')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('payments')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) query = query.lt('created_at', cursor)
    if (status) query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) {
      console.error('Payments fetch error (RLS):', error)
      
      // Service-role fallback for admins/managers
      if (['admin', 'owner', 'manager'].includes(profile?.role || '')) {
        console.log('🔄 Using service-role fallback for payments')
        
        const serviceSb = createServiceClient()
        let fallbackQuery = serviceSb
          .from('payments')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
          .limit(limit + 1)

        if (cursor) fallbackQuery = fallbackQuery.lt('created_at', cursor)
        if (status) fallbackQuery = fallbackQuery.eq('status', status)
        if (projectId) fallbackQuery = fallbackQuery.eq('project_id', projectId)

        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        
        if (fallbackError) {
          console.error('Service-role fallback also failed:', fallbackError)
          return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
        }

        const items = (fallbackData || []) as any[]
        let nextCursor: string | null = null

        if (items.length > limit) {
          const extra = items.pop()
          nextCursor = items[items.length - 1]?.created_at || extra?.created_at || null
        }

        return NextResponse.json({ items, nextCursor })
      }
      
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
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
    const supabase = await sbServer()
    const body = await req.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id and role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
    }

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

    const paymentData = {
      company_id: profile.company_id,
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
      created_by: user.id,
    }

    // Try with normal RLS first
    let { data: payment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('*')
      .single()

    // Service-role fallback if RLS blocks
    if (error && ['admin', 'owner', 'manager'].includes(profile?.role || '')) {
      console.log('🔄 Using service-role fallback for payment creation')
      
      const serviceSb = createServiceClient()
      const fallbackResult = await serviceSb
        .from('payments')
        .insert(paymentData)
        .select('*')
        .single()
      
      payment = fallbackResult.data
      error = fallbackResult.error
    }

    if (error || !payment) {
      console.error('Payment creation error:', error)
      return NextResponse.json({ 
        error: error?.message || 'Failed to create payment',
        details: error?.details || 'No details available'
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: payment }, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/payments error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
