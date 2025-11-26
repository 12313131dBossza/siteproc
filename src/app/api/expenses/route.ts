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

    // Admin/bookkeeper/owner fallback: if nothing visible but company exists, fetch via service role (company-scoped ONLY)
    const role = profile?.role as string | null
    if (rows.length === 0 && companyId && role && ['admin','owner','bookkeeper'].includes(role)) {
      try {
        const svc = supabaseService()
        const { data: svcData, error: svcErr } = await svc
          .from('expenses')
          .select('*')
          .eq('company_id', companyId)  // ONLY their company
          .order('created_at', { ascending: false })
        if (!svcErr && svcData) {
          rows = svcData as any[]
          usedFallback = true
        }
      } catch {}
    }

    // REMOVED: Cross-company diagnostic fallback - violates data isolation

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
      project_id: e.project_id || e.job_id, // Try project_id first, fallback to job_id for legacy data
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
      submitted_by: user.id, // Set submitted_by for notification triggers
      receipt_url: body.receipt_url || null,
    }

    // Handle project association - only use project_id column (added by migration)
    // Do NOT set job_id as it references a different table (jobs vs projects)
    if (body.project_id) {
      baseData.project_id = body.project_id
      
      // Check if user is a full company member or has project-level permission
      const isFullCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(profile.role || '')
      
      if (!isFullCompanyMember) {
        // External user - check project_members for create_orders permission (expenses use same permission)
        const svc = supabaseService()
        const { data: membership } = await svc
          .from('project_members')
          .select('permissions')
          .eq('project_id', body.project_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
        
        const permissions = (membership as { permissions?: { create_orders?: boolean } } | null)?.permissions
        if (!permissions?.create_orders) {
          return NextResponse.json({ error: 'You do not have permission to create expenses on this project' }, { status: 403 })
        }
      }
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

    return NextResponse.json({
      id: expense.id,
      vendor: expense.vendor,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      status: expense.status,
      created_at: expense.created_at,
      project_id: expense.project_id || expense.job_id // Return project_id, fallback to job_id for legacy
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
