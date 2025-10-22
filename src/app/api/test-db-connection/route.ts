import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct connection test - bypasses all middleware/auth
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Check environment variables
    const envCheck = {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl?.substring(0, 30) + '...', // Show partial for security
      keyPrefix: supabaseKey?.substring(0, 20) + '...'
    }
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        ok: false,
        error: 'Missing Supabase environment variables',
        env: envCheck
      }, { status: 500 })
    }
    
    // Create direct client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test 1: Can we connect?
    const { data: testConnection, error: connError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (connError) {
      return NextResponse.json({
        ok: false,
        error: 'Failed to connect to Supabase',
        details: connError.message,
        env: envCheck
      }, { status: 500 })
    }
    
    // Test 2: Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, company_id, role')
      .eq('email', 'yaibondiseiei@gmail.com')
    
    // Test 3: Check companies table
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5)
    
    // Test 4: Check purchase_orders table
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('id, description, amount, status, project_id')
      .limit(10)
    
    // Test 5: Check projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, code, company_id')
      .limit(5)
    
    return NextResponse.json({
      ok: true,
      message: 'Direct database connection test',
      env: envCheck,
      results: {
        connection: {
          success: !connError,
          error: connError?.message
        },
        profiles: {
          count: profiles?.length || 0,
          data: profiles,
          error: profilesError?.message,
          found: profiles && profiles.length > 0 ? '✅ Profile exists' : '❌ Profile not found'
        },
        companies: {
          count: companies?.length || 0,
          data: companies,
          error: companiesError?.message
        },
        projects: {
          count: projects?.length || 0,
          data: projects,
          error: projectsError?.message
        },
        purchase_orders: {
          count: orders?.length || 0,
          data: orders,
          error: ordersError?.message
        }
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: 'Exception in connection test',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
