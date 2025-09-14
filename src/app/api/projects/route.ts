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

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json([])
    }

    // Get projects for the company
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    return NextResponse.json({ data: projects || [] })
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Create project with simple fields
    const projectData = {
      name: body.name,
      project_number: body.project_number || `PRJ-${Date.now()}`,
      description: body.description || '',
      status: body.status || 'planning',
      company_id: profile.company_id,
      created_by: user.id,
      start_date: body.start_date || new Date().toISOString().split('T')[0],
      end_date: body.end_date || null,
      budget: parseFloat(body.budget) || 0
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create project',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}