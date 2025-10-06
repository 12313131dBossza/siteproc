import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

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
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Get all projects for this company
    console.log('🔍 Fetching projects for company_id:', profile.company_id)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Projects fetch error:', error)
      throw error
    }

    console.log('✅ Projects found:', projects?.length || 0)
    console.log('📦 Projects data:', JSON.stringify(projects, null, 2))

    // Map project_number to code for frontend compatibility
    const projectsWithCode = projects?.map(p => ({
      ...p,
      code: p.project_number
    })) || []

    // Return projects array directly (not wrapped in data object)
    return NextResponse.json(projectsWithCode)
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
      .select('company_id')
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

    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

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