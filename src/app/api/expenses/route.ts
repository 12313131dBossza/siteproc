import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

// GET /api/expenses - List expenses for user's company
export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ expenses: [] }, { status: 200 })
    }

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

    // Simple mapping without complex transformations
    const formattedExpenses = expenses?.map(expense => ({
      id: expense.id,
      vendor: expense.vendor || expense.description || 'Unknown Vendor',
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Simple insert with the fields that were working
    const expenseData = {
      vendor: body.vendor || body.description || 'Unknown Vendor',
      category: body.category || 'other',
      amount: parseFloat(body.amount) || 0,
      description: body.description || '',
      memo: body.description || '',
      status: 'pending',
      company_id: profile.company_id,
      project_id: body.project_id || null,
      spend_date: new Date().toISOString().split('T')[0],
      created_by: user.id
    }

    // Auto-approve for admins
    if (profile.role === 'admin' || profile.role === 'owner') {
      expenseData.status = 'approved'
      ;(expenseData as any).decided_at = new Date().toISOString()
      ;(expenseData as any).decided_by = user.id
    }

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

    // Return simplified response
    return NextResponse.json({
      id: expense.id,
      vendor: expense.vendor,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      status: expense.status,
      created_at: expense.created_at
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ 
      error: 'Failed to create expense',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
