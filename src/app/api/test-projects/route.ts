import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

// Test endpoint to debug projects API
export async function GET() {
  try {
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        userId: null,
        timestamp: new Date().toISOString()
      })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get all projects for company
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', profile?.company_id)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      projectsCount: projects?.length || 0,
      projects: projects || [],
      deploymentVersion: '2025-10-05-v2'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
