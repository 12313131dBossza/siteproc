import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const debugInfo: any = {
      user: {
        id: user.id,
        email: user.email,
        authenticated: true
      },
      profile: null,
      company: null,
      projects: [],
      expenses: [],
      tables: {}
    }

    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    debugInfo.profile = {
      exists: !!profile,
      data: profile,
      error: profileError?.message
    }

    // If profile exists, check company
    if (profile?.company_id) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()

      debugInfo.company = {
        exists: !!company,
        data: company,
        error: companyError?.message
      }

      // Check projects for this company
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', profile.company_id)
        .limit(5)

      debugInfo.projects = {
        count: projects?.length || 0,
        data: projects,
        error: projectsError?.message
      }

      // Check expenses for this company
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('company_id', profile.company_id)
        .limit(5)

      debugInfo.expenses = {
        count: expenses?.length || 0,
        data: expenses,
        error: expensesError?.message
      }
    }

    // Check table structures (schema info)
    const tables = ['profiles', 'companies', 'projects', 'expenses']
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        debugInfo.tables[table] = {
          accessible: !error,
          error: error?.message,
          sampleRecord: data?.[0] || null
        }
      } catch (err) {
        debugInfo.tables[table] = {
          accessible: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    // Check RLS policies (try to access other company data)
    if (profile?.company_id) {
      try {
        const { data: allProjects, error: rlsError } = await supabase
          .from('projects')
          .select('company_id')
          .neq('company_id', profile.company_id)
          .limit(1)

        debugInfo.rls = {
          working: rlsError?.message?.includes('row-level security') || allProjects?.length === 0,
          canAccessOtherCompanies: !!allProjects?.length,
          error: rlsError?.message
        }
      } catch (err) {
        debugInfo.rls = {
          working: true,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      debug: debugInfo
    })

  } catch (error) {
    console.error('Debug check error:', error)
    return NextResponse.json({
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}