import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer()
    
    console.log('=== EXPENSE DEBUG START ===')
    
    // Step 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const authResult = {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    }
    console.log('Auth result:', authResult)
    
    if (!user) {
      return NextResponse.json({
        step: 'auth',
        success: false,
        error: 'No user found',
        debug: { authResult }
      })
    }
    
    // Step 2: Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      
    const profileResult = {
      hasProfile: !!profile,
      profileId: profile?.id,
      companyId: profile?.company_id,
      role: profile?.role,
      profileError: profileError?.message
    }
    console.log('Profile result:', profileResult)
    
    if (!profile) {
      return NextResponse.json({
        step: 'profile',
        success: false,
        error: 'No profile found',
        debug: { authResult, profileResult }
      })
    }
    
    // Step 3: Check company
    let companyResult = null
    if (profile.company_id) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()
        
      companyResult = {
        hasCompany: !!company,
        companyId: company?.id,
        companyName: company?.name,
        companyError: companyError?.message
      }
      console.log('Company result:', companyResult)
    }
    
    // Step 4: Check if we can create an expense (test insert)
    const testExpenseData = {
      vendor: 'DEBUG_TEST_VENDOR',
      category: 'other',
      amount: 1,
      description: 'Debug test expense',
      memo: 'Debug test',
      status: 'pending',
      company_id: profile.company_id,
      spent_at: new Date().toISOString().split('T')[0],
      spent_on: new Date().toISOString().split('T')[0],
      user_id: user.id,
      tax: 0
    }
    
    console.log('Attempting to insert test expense:', testExpenseData)
    
    const { data: testExpense, error: insertError } = await supabase
      .from('expenses')
      .insert(testExpenseData)
      .select()
      .single()
    
    const insertResult = {
      success: !!testExpense,
      expenseId: testExpense?.id,
      insertError: insertError?.message,
      insertErrorDetails: insertError
    }
    console.log('Insert result:', insertResult)
    
    // Clean up test expense if created
    if (testExpense?.id) {
      await supabase
        .from('expenses')
        .delete()
        .eq('id', testExpense.id)
      console.log('Cleaned up test expense:', testExpense.id)
    }
    
    console.log('=== EXPENSE DEBUG END ===')
    
    return NextResponse.json({
      step: 'complete',
      success: !insertError,
      debug: {
        authResult,
        profileResult,
        companyResult,
        insertResult,
        testExpenseData
      }
    })

  } catch (error) {
    console.error('Debug expense error:', error)
    return NextResponse.json({
      step: 'error',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}