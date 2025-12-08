import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

// GET /api/projects - List projects for user's company
export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company from profiles table
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
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Get filter parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const minBudget = searchParams.get('minBudget')
    const maxBudget = searchParams.get('maxBudget')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Check if user is a full company member (admin/owner/manager/bookkeeper/member)
    // or just an external viewer with project-specific access
    const isFullCompanyMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile.role || '')
    
    let projects: any[] = []
    
    if (isFullCompanyMember) {
      // Full company members can see all company projects
      console.log('🔍 Fetching ALL projects for company member, company_id:', profile.company_id)
      let query = supabase
        .from('projects')
        .select('*')
        .or(`company_id.eq.${profile.company_id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false })

      // Apply filters
      if (status) query = query.eq('status', status)
      if (minBudget) query = query.gte('budget', Number(minBudget))
      if (maxBudget) query = query.lte('budget', Number(maxBudget))
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)

      const { data, error } = await query
      
      if (error) {
        console.error('❌ Projects fetch error:', error)
        // Fallback to service role
        const serviceSb = createServiceClient()
        let fallbackQuery = serviceSb
          .from('projects')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })

        if (status) fallbackQuery = fallbackQuery.eq('status', status)
        if (minBudget) fallbackQuery = fallbackQuery.gte('budget', Number(minBudget))
        if (maxBudget) fallbackQuery = fallbackQuery.lte('budget', Number(maxBudget))
        if (startDate) fallbackQuery = fallbackQuery.gte('created_at', startDate)
        if (endDate) fallbackQuery = fallbackQuery.lte('created_at', endDate)

        const { data: fallbackData } = await fallbackQuery
        projects = fallbackData || []
      } else {
        projects = data || []
      }
    } else {
      // External users (viewers) only see projects they're members of
      console.log('🔍 Fetching projects for external viewer, user_id:', user.id)
      
      const serviceSb = createServiceClient()
      
      // First get project IDs the user has access to
      const { data: memberProjects, error: memberError } = await serviceSb
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
      
      if (memberError) {
        console.error('Error fetching project memberships:', memberError)
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
      }
      
      if (!memberProjects || memberProjects.length === 0) {
        console.log('User has no project memberships')
        return NextResponse.json({ success: true, data: [] })
      }
      
      const projectIds = memberProjects.map(m => m.project_id)
      console.log('User has access to projects:', projectIds)
      
      // Fetch only those projects
      let query = serviceSb
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false })

      // Apply filters
      if (status) query = query.eq('status', status)
      if (minBudget) query = query.gte('budget', Number(minBudget))
      if (maxBudget) query = query.lte('budget', Number(maxBudget))
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)

      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching projects for viewer:', error)
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
      }
      
      projects = data || []
    }

    console.log('✅ Projects found:', projects.length)

    // Map project_number to code for frontend compatibility
    const projectsWithCode = projects.map(p => ({
      ...p,
      code: p.project_number
    }))

    // Return in consistent format for dashboard
    return NextResponse.json({ success: true, data: projectsWithCode })
  } catch (error) {
    console.error('Error in GET /api/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Create project - only include REQUIRED fields
    // Start with minimal data - name, company, user, budget
    const projectData: any = {
      name: body.name || 'Untitled Project',
      company_id: profile.company_id,
      created_by: user.id,
      budget: parseFloat(body.budget) || 0
    }

    // Only add optional fields if they're provided
    if (body.code || body.project_number) {
      projectData.project_number = body.code || body.project_number
    }
    
    if (body.status) {
      projectData.status = body.status
    }

    console.log('Creating project with data:', projectData)

    let project
    let error
    
    // Try with normal RLS first
    const result = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()
    
    project = result.data
    error = result.error

    // Service-role fallback if RLS blocks
    if (error && ['admin', 'owner', 'manager', 'bookkeeper'].includes(profile.role || '')) {
      console.log('🔄 Using service-role fallback for project creation')
      
      const serviceSb = createServiceClient()
      const fallbackResult = await serviceSb
        .from('projects')
        .insert(projectData)
        .select()
        .single()
      
      project = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('❌ PROJECT INSERT ERROR:', error)
      console.error('Attempted to insert:', projectData)
      return NextResponse.json({ 
        error: 'Failed to create project', 
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    console.log('Project created:', project)
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}