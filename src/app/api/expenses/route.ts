import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, validateRole, logActivity, getCompanyAdminEmails, response } from '@/lib/server-utils'
import { sendExpenseSubmissionNotification } from '@/lib/email'

// GET /api/expenses - List expenses for user's company
export async function GET(request: NextRequest) {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    // Resolve which projects the user can see (by company)
    let allowedProjectIds: string[] = []
    if (projectId) {
      // Verify requested project belongs to user's company
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .select('id, company_id')
        .eq('id', projectId)
        .eq('company_id', profile.company_id)
        .single()
      if (projErr || !proj) {
        return NextResponse.json({ expenses: [] }, { status: 200 })
      }
      allowedProjectIds = [proj.id]
    } else {
      const { data: projects, error: projListErr } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', profile.company_id)
      if (projListErr) {
        console.error('Error listing projects for company:', projListErr)
        return response.error('Failed to fetch expenses', 500)
      }
      allowedProjectIds = (projects || []).map(p => p.id)
    }

    if (!allowedProjectIds.length) {
      return NextResponse.json({ expenses: [] }, { status: 200 })
    }

    // Build expenses query filtered by allowed projects
    let query = supabase
      .from('expenses')
      .select('*')
      .in('project_id', allowedProjectIds)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      return response.error('Failed to fetch expenses', 500)
    }

    // Normalize payload for the frontend (avoid nulls and ensure expected keys)
    const expenses = (rows || []).map((r: any) => ({
      id: r.id,
      vendor: r.vendor ?? 'Unknown',
      category: (r.category ?? 'other').toLowerCase(),
      amount: typeof r.amount === 'number' ? r.amount : parseFloat(r.amount ?? '0'),
      description: r.description ?? '',
      receipt_url: r.receipt_url ?? undefined,
      status: r.status ?? 'pending',
      project_id: r.project_id ?? undefined,
      project_name: undefined,
      created_at: r.created_at,
      approved_at: r.approved_at ?? undefined,
      approved_by: r.approved_by ?? undefined,
      approval_notes: r.approval_notes ?? undefined,
      created_by_profile: undefined
    }))

    // Return shape the page expects: { expenses }
    return NextResponse.json({ expenses }, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/expenses:', error)
    return response.error('Internal server error', 500)
  }
}

// POST /api/expenses - Create new expense submission
export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    
    const body = await request.json()
    const { 
      project_id, 
      job_id, 
      amount, 
      description, 
      memo, 
      category, 
      receipt_url, 
      spent_at,
      vendor
    } = body

    // Support both project_id and job_id for backwards compatibility
    const actualProjectId = project_id || job_id
    const actualDescription = description || memo || 'No description provided'
    const actualCategory = category || 'general'

    // Validate required fields
    if (!actualProjectId || !amount) {
      return response.error('project_id (or job_id) and amount are required', 400)
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return response.error('Amount must be a positive number', 400)
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .eq('id', actualProjectId)
      .eq('company_id', profile.company_id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return response.error('Project not found', 404)
      }
      console.error('Error verifying project:', projectError)
      return response.error('Failed to verify project', 500)
    }

    // Determine initial status - admins can create pre-approved expenses
    const isAdmin = validateRole(profile, 'admin')
    const initialStatus = isAdmin ? 'approved' : 'pending'

    // Create expense
    const expenseData: any = {
      project_id: actualProjectId,
      amount,
      description: actualDescription,
      category: actualCategory,
      status: initialStatus,
      submitted_by: profile.id,
      submitted_at: spent_at || new Date().toISOString()
    }

    if (vendor) {
      expenseData.vendor = vendor
    }

    if (receipt_url) {
      expenseData.receipt_url = receipt_url
    }

    if (initialStatus === 'approved') {
      expenseData.approved_by = profile.id
      expenseData.approved_at = new Date().toISOString()
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select(`
        id,
        project_id,
        amount,
        description,
        category,
        status,
        receipt_url,
        submitted_by,
        submitted_at,
        approved_by,
        approved_at,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating expense:', error)
      return response.error('Failed to create expense', 500)
    }

    // Log activity
    await logActivity(
      profile.company_id,
      profile.id,
      'expense',
      expense.id,
      initialStatus === 'approved' ? 'approve' : 'create',
      {
        projectId: actualProjectId,
        description: actualDescription,
        amount,
        category: actualCategory,
        status: initialStatus
      }
    )

    // Send notification to admins if pending
    if (initialStatus === 'pending') {
      try {
        const adminEmails = await getCompanyAdminEmails(profile.company_id)
        if (adminEmails.length > 0) {
          await sendExpenseSubmissionNotification({
            expenseId: expense.id,
            projectName: project.name,
            companyName: profile.company?.name || 'Unknown Company',
            submittedBy: profile.full_name || 'Unknown User',
            submittedByEmail: profile.email || '',
            amount: expense.amount,
            description: expense.description,
            category: expense.category,
            adminName: adminEmails[0], // Send to first admin
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project_id}`,
            receiptUrl: expense.receipt_url || undefined
          })
        }
      } catch (emailError) {
        console.error('Failed to send expense submission notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return response.success(expense, 201)
  } catch (error) {
    console.error('Error in POST /api/expenses:', error)
    return response.error('Internal server error', 500)
  }
}
