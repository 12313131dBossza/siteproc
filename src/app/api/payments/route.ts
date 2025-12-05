import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { logActivity } from '@/app/api/activity/route'
import { notifyPaymentCreated } from '@/lib/notification-triggers'
import { autoSyncPaymentToZoho } from '@/lib/zoho-autosync'

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

    // Validation - vendor is REQUIRED
    if (!vendor_name || !vendor_name.trim()) {
      return NextResponse.json({ error: 'Vendor / Payee is required. Please select or enter a vendor name.' }, { status: 400 })
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }
    // Validation - payment_method is REQUIRED
    if (!payment_method || !payment_method.trim()) {
      return NextResponse.json({ error: 'Payment Method is required. Please select how this payment was made.' }, { status: 400 })
    }

    // Use fallback vendor name if somehow empty
    const finalVendorName = vendor_name.trim() || 'UNKNOWN VENDOR – REVIEW NEEDED';
    const finalPaymentMethod = payment_method.trim() || 'other';

    const paymentData = {
      company_id: profile.company_id,
      project_id: project_id || null,
      order_id: order_id || null,
      expense_id: expense_id || null,
      vendor_name: finalVendorName,
      amount: parseFloat(amount),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method: finalPaymentMethod,
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

    // Log activity
    try {
      await logActivity({
        type: 'payment',
        action: 'created',
        title: 'Payment Created',
        description: `${payment.vendor_name} - ${payment.payment_method} - $${payment.amount}`,
        entity_type: 'payment',
        entity_id: payment.id,
        metadata: {
          vendor_name: payment.vendor_name,
          amount: payment.amount,
          payment_method: payment.payment_method,
          status: payment.status,
          project_id: payment.project_id,
          order_id: payment.order_id,
          expense_id: payment.expense_id
        },
        status: 'success',
        amount: payment.amount
      })
    } catch (logError) {
      console.error('Failed to log payment creation activity:', logError)
      // Don't fail the request if logging fails
    }

    // Create in-app notification for payment approvers
    try {
      // Get all admins/owners/bookkeepers in the company to notify
      const { data: approvers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('company_id', profile.company_id)
        .in('role', ['admin', 'owner', 'bookkeeper'])
        .neq('id', user.id) // Don't notify creator

      if (approvers && approvers.length > 0) {
        const approverIds = approvers.map(a => a.id)
        
        // Get creator's name
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single()
        
        const creatorName = creatorProfile 
          ? `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim() || creatorProfile.email
          : 'A team member'

        await notifyPaymentCreated({
          paymentId: payment.id,
          approverUserIds: approverIds,
          companyId: profile.company_id,
          amount: payment.amount,
          vendor: payment.vendor_name,
          paymentMethod: payment.payment_method,
          creatorName
        })
        console.log(`✅ Payment notification sent to ${approverIds.length} approvers`)
      }
    } catch (notifError) {
      console.error('Failed to create payment notification:', notifError)
      // Don't fail the request if notification fails
    }

    // Sync paid payments to Zoho Books
    if (payment.status === 'paid') {
      try {
        const zohoResult = await autoSyncPaymentToZoho(profile.company_id, payment.id, 'paid')
        if (zohoResult.synced) {
          console.log(`✅ Payment synced to Zoho Books: ${zohoResult.zohoId}`)
        } else if (zohoResult.error) {
          console.log(`⚠️ Zoho sync skipped: ${zohoResult.error}`)
        }
      } catch (zohoError) {
        console.error('❌ Zoho sync error:', zohoError)
        // Don't fail - payment was created successfully
      }
    }

    return NextResponse.json({ ok: true, data: payment }, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/payments error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
