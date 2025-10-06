import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { logActivity } from '@/app/api/activity/route'

// GET /api/expenses - List expenses for user's company
export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's company with proper error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile?.company_id) {
      console.log('No company ID for user:', user.id)
      return NextResponse.json({ expenses: [] }, { status: 200 })
    }

    console.log('Fetching expenses for company:', profile.company_id)

    // Get expenses directly - simple query
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }

    console.log('Found expenses:', expenses?.length || 0)

    // Improved mapping to handle missing data properly
    const formattedExpenses = expenses?.map(expense => ({
      id: expense.id,
      vendor: expense.vendor || (expense.description ? expense.description.substring(0, 50) : 'Expense'),
      category: expense.category || 'other',
      amount: expense.amount || 0,
      description: expense.description || expense.memo || '',
      status: expense.status || 'pending',
      created_at: expense.created_at,
      approved_at: expense.approved_at || expense.decided_at,
      approved_by: expense.approved_by || expense.decided_by,
      project_id: expense.project_id,
      receipt_url: expense.receipt_url
    })) || []

    return NextResponse.json({ expenses: formattedExpenses })
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

    console.log('Creating expense with body:', body)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile?.company_id) {
      console.error('No company associated with user:', user.id)
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Ensure we have required fields
    if (!body.vendor && !body.description) {
      return NextResponse.json({ error: 'Vendor or description is required' }, { status: 400 })
    }

    if (!body.amount || parseFloat(body.amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    // Create expense data using the correct database column names
    const expenseData = {
      vendor: body.vendor || (body.description ? body.description.substring(0, 100) : 'Expense'),
      category: body.category || 'other',
      amount: parseFloat(body.amount),
      description: body.description || body.vendor || '',
      memo: body.memo || body.description || '',
      status: 'pending',
      company_id: profile.company_id,
      project_id: body.project_id || null,
      spent_at: body.spend_date || new Date().toISOString().split('T')[0],
      spent_on: body.spend_date || new Date().toISOString().split('T')[0],
      user_id: user.id,
      tax: 0
    }

    // Auto-approve for admins
    if (profile.role === 'admin' || profile.role === 'owner') {
      expenseData.status = 'approved'
      ;(expenseData as any).approved_at = new Date().toISOString()
      ;(expenseData as any).approved_by = user.id
    }

    console.log('Inserting expense data:', expenseData)

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create expense',
        details: error.message 
      }, { status: 500 })
    }

    console.log('Expense created successfully:', expense)

    // Log activity for expense creation
    try {
      await logActivity({
        type: 'expense',
        action: expense.status === 'approved' ? 'approved' : 'created',
        title: `Expense ${expense.status === 'approved' ? 'Auto-Approved' : 'Created'}`,
        description: `${expense.vendor || expense.description} - ${expense.category}`,
        entity_type: 'expense',
        entity_id: expense.id,
        metadata: {
          vendor: expense.vendor,
          category: expense.category,
          project_id: expense.project_id,
          auto_approved: expense.status === 'approved'
        },
        status: 'success',
        amount: expense.amount
      })
    } catch (logError) {
      console.error('Failed to log expense activity:', logError)
    }

    // Return properly formatted response
    return NextResponse.json({
      id: expense.id,
      vendor: expense.vendor,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      status: expense.status,
      created_at: expense.created_at,
      project_id: expense.project_id
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ 
      error: 'Failed to create expense',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
