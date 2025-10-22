import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

/**
 * Debug endpoint for Projects - uses service-role to bypass RLS
 * GET /api/projects-debug - List last 20 projects
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get last 20 projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        project_number,
        company_id,
        created_by,
        status,
        budget,
        actual_cost,
        orders_total,
        expenses_total,
        deliveries_total,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching projects (debug):', error)
      return NextResponse.json({
        ok: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      count: projects.length,
      projects
    })
  } catch (error: any) {
    console.error('Unexpected error in projects-debug:', error)
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 })
  }
}
