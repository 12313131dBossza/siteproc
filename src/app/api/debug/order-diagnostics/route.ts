import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await sbServer()
    
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      auth: {
        success: !authError && !!user,
        userId: user?.id || null,
        email: user?.email || null,
        error: authError?.message || null
      },
      profile: null,
      company: null,
      ordersTable: null,
      projectsCount: null
    }

    if (!user) {
      return NextResponse.json(diagnostics, { status: 200 })
    }

    // Test 2: Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id, role')
      .eq('id', user.id)
      .single()

    diagnostics.profile = {
      exists: !!profile,
      data: profile,
      error: profileError?.message || null
    }

    if (!profile?.company_id) {
      diagnostics.profile.warning = 'No company_id assigned to profile'
      return NextResponse.json(diagnostics, { status: 200 })
    }

    // Test 3: Check company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', profile.company_id)
      .single()

    diagnostics.company = {
      exists: !!company,
      data: company,
      error: companyError?.message || null
    }

    // Test 4: Check orders table structure
    try {
      const { data: sampleOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .limit(1)
        .maybeSingle()

      diagnostics.ordersTable = {
        accessible: !orderError,
        columns: sampleOrder ? Object.keys(sampleOrder) : null,
        sampleData: sampleOrder,
        error: orderError?.message || null
      }
    } catch (e: any) {
      diagnostics.ordersTable = {
        accessible: false,
        error: e.message
      }
    }

    // Test 5: Check projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .limit(5)

    diagnostics.projectsCount = projects?.length || 0
    diagnostics.projects = {
      data: projects,
      error: projectsError?.message || null
    }

    // Test 6: Try a mock order insert (rollback immediately)
    try {
      const mockOrder = {
        project_id: projects?.[0]?.id || '00000000-0000-0000-0000-000000000000',
        amount: 100,
        description: 'Test order',
        category: 'Test',
        status: 'pending',
        requested_by: user.id,
        requested_at: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('orders')
        .insert(mockOrder)
        .select()

      diagnostics.orderInsertTest = {
        canInsert: !insertError,
        error: insertError?.message || null,
        errorCode: insertError?.code || null,
        errorDetails: insertError?.details || null
      }
    } catch (e: any) {
      diagnostics.orderInsertTest = {
        canInsert: false,
        error: e.message
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
