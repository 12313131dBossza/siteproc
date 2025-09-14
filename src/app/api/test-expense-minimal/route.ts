import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== MINIMAL EXPENSE TEST START ===')
    
    const supabase = await sbServer()
    const body = await request.json()
    
    console.log('Request body:', body)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth failed:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      console.log('Profile error:', profileError)
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }
    
    console.log('Profile found with company:', profile.company_id)

    // Try to insert with minimal fields only - using correct schema
    const minimalExpenseData = {
      vendor: body.vendor || 'Test Vendor',
      amount: parseFloat(body.amount) || 100,
      company_id: profile.company_id,
      category: 'other',
      status: 'pending',
      spent_at: new Date().toISOString().split('T')[0],
      spent_on: new Date().toISOString().split('T')[0],
      user_id: user.id,
      tax: 0
    }

    console.log('Attempting insert with minimal data:', minimalExpenseData)

    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert(minimalExpenseData)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ 
        error: 'Insert failed', 
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code
      }, { status: 500 })
    }

    console.log('Success! Created expense:', expense)
    console.log('=== MINIMAL EXPENSE TEST END ===')

    return NextResponse.json({
      success: true,
      expense: expense,
      message: 'Minimal expense created successfully'
    })

  } catch (error) {
    console.error('Minimal expense test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}