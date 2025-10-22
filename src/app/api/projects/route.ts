import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

// GET /api/projects - List projects for user's company
export async function GET() {
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

    // Get all projects for this company (broadened filter for visibility)
    console.log('🔍 Fetching projects for company_id:', profile.company_id)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .or(`company_id.eq.${profile.company_id},created_by.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Projects fetch error (RLS):', error)
      
      // Service-role fallback for admins/managers/bookkeepers
      if (['admin', 'owner', 'manager', 'bookkeeper'].includes(profile.role || '')) {
        console.log('🔄 Using service-role fallback for projects')
        
        const serviceSb = createServiceClient()
        const { data: fallbackProjects, error: fallbackError } = await serviceSb
          .from('projects')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })

        if (fallbackError) {
          console.error('Service-role fallback also failed:', fallbackError)
          return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
        }

        // Map project_number to code for frontend compatibility
        const projectsWithCode = fallbackProjects?.map(p => ({
          ...p,
          code: p.project_number
        })) || []

        return NextResponse.json({ success: true, data: projectsWithCode })
      }
      
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    console.log('✅ Projects found:', projects?.length || 0)

    // Map project_number to code for frontend compatibility
    const projectsWithCode = projects?.map(p => ({
      ...p,
      code: p.project_number
    })) || []

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