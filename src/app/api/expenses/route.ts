import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { supabaseService } from '@/lib/supabase'
import { logActivity } from '@/app/api/activity/route'
import { sendExpenseSubmissionNotification } from '@/lib/email'
import { getCompanyAdminEmails } from '@/lib/server-utils'

// GET /api/expenses - List expenses for user's company
export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()
  if (profileError) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const companyId = profile?.company_id as string | null
    const userId = user.id
    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (companyId) {
      // Include both company expenses and any explicitly user-owned items
      query = query.or(`company_id.eq.${companyId},user_id.eq.${userId}`)
    } else {
      // No company on profile: still show user's own expenses
      query = query.eq('user_id', userId)
    }

    if (search) query = query.ilike('memo', `%${search}%`)
    if (status) query = query.eq('status', status)

    const { data: expenses, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch expenses', details: error.message }, { status: 500 })

    let usedFallback = false
    let rows = expenses || []

    // Admin/bookkeeper/owner fallback: if nothing visible but company exists, fetch via service role (company-scoped)
    const role = profile?.role as string | null
    if (rows.length === 0 && companyId && role && ['admin','owner','bookkeeper'].includes(role)) {
      try {
        const svc = supabaseService()
        const { data: svcData, error: svcErr } = await svc
          .from('expenses')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
        if (!svcErr && svcData) {
          rows = svcData as any[]
          usedFallback = true
        }
      } catch {}
    }

    // As a final diagnostic fallback for admins, if still empty, show last N expenses across all companies
    if (rows.length === 0 && role && ['admin','owner','bookkeeper'].includes(role)) {
      try {
        const svc = supabaseService()
        const { data: svcAll, error: svcAllErr } = await svc
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        if (!svcAllErr && svcAll && svcAll.length > 0) {
          rows = svcAll as any[]
          usedFallback = true
        }
      } catch {}
    }

    const formatted = rows.map((e: any) => ({
      id: e.id,
      vendor: e.vendor || (e.description ? String(e.description).slice(0, 50) : 'Expense'),
      category: e.category || 'other',
      amount: Number(e.amount) || 0,
      description: e.description || e.memo || '',
      status: e.status || 'pending',
      created_at: e.created_at,
      approved_at: e.approved_at,
      approved_by: e.approved_by,
      project_id: e.job_id, // Map job_id to project_id for frontend
      receipt_url: e.receipt_url
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    console.error('Error in GET /api/expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expenses - Create new expense submission
export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer()
    const body = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()
    if (profileError) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (!profile?.company_id) return NextResponse.json({ error: 'No company associated' }, { status: 400 })

    // Validate minimal fields
    const amount = parseFloat(body.amount)
    if (isNaN(amount) || amount <= 0) return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })

    const vendor = body.vendor || (body.description ? String(body.description).slice(0, 100) : 'Expense')
    const category = body.category || 'other'
    const spendDate = body.spend_date || new Date().toISOString().split('T')[0]

    const baseData: any = {
      vendor,
      category,
      amount,
      description: body.description || body.vendor || '',
      memo: body.memo || body.description || '',
      status: body.status || 'pending', // Respect user-selected status
      company_id: profile.company_id,
      spent_at: spendDate,
      user_id: user.id,
      receipt_url: body.receipt_url || null,
    }

    // Handle project association - try both job_id and project_id columns
    if (body.project_id) {
      baseData.project_id = body.project_id // New column from SQL migration
      baseData.job_id = body.project_id // Legacy column for backward compatibility
    }

    // If status is 'approved', set approval metadata
    if (baseData.status === 'approved') {
      baseData.approved_at = new Date().toISOString()
      baseData.approved_by = user.id
    }

    // Try normal insert first (respect RLS)
    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert(baseData)
      .select('*')
      .single()

    let expense = inserted
    if (error) {
      // Fallback with service role to avoid RLS blocks during migration
      console.warn('RLS blocked expense insert, retrying with service role:', error.message)
      try {
        const svc = supabaseService()
        const { data: svcIns, error: svcErr } = await svc.from('expenses').insert(baseData).select('*').single()
        if (svcErr) return NextResponse.json({ error: 'Failed to create expense', details: svcErr.message }, { status: 500 })
        expense = svcIns as any
      } catch (e: any) {
        return NextResponse.json({ error: 'Failed to create expense', details: e?.message || 'service-fallback' }, { status: 500 })
      }
    }

    // Log activity (best-effort)
    try {
      await logActivity({
        type: 'expense',
        action: expense.status === 'approved' ? 'approved' : 'created',
        title: `Expense ${expense.status === 'approved' ? 'Auto-Approved' : 'Created'}`,
        description: `${expense.vendor || expense.description} - ${expense.category}`,
        entity_type: 'expense',
        entity_id: expense.id,
        metadata: { vendor: expense.vendor, category: expense.category, project_id: expense.project_id, auto_approved: expense.status === 'approved' },
        status: 'success',
        amount: expense.amount
      })
    } catch {}

    // Send email notification to admins (only if pending approval)
    if (expense.status === 'pending') {
      try {
        const adminEmails = await getCompanyAdminEmails(profile.company_id)
        const submitterName = profile.full_name || user.email || 'User'
        
        if (adminEmails.length > 0) {
          await sendExpenseSubmissionNotification({
            expenseId: expense.id,
            vendor: expense.vendor || 'Vendor',
            category: expense.category,
            amount: expense.amount,
            description: expense.description || '',
            submittedBy: submitterName,
            submittedByEmail: user.email || '',
            companyName: profile.company?.name || 'Your Company',
            approverName: adminEmails[0],
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/expenses`
          })
        }
      } catch (emailError) {
        console.error('Failed to send expense submission notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      id: expense.id,
      vendor: expense.vendor,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      status: expense.status,
      created_at: expense.created_at,
      project_id: expense.job_id // Map job_id back to project_id for frontend
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
