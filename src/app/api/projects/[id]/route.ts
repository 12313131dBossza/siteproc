import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

// GET /api/projects/[id] - Get specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Get project - only select fields that exist
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      console.error('❌ Error fetching project:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch project', details: error.message }, { status: 500 })
    }

    // Map project_number to code for frontend compatibility
    const projectWithCode = {
      ...project,
      code: project.project_number
    }

    console.log('✅ Project fetched:', projectWithCode.id, projectWithCode.name)
    return NextResponse.json({ data: projectWithCode })
  } catch (error: any) {
    console.error('❌ Error in GET /api/projects/[id]:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// PUT /api/projects/[id] - Update project (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    
    // Validate admin role
    if (!validateRole(profile, 'admin')) {
      return response.error('Only admins can update projects', 403)
    }

    const body = await request.json()
    const { name, budget, status, project_number } = body

    // Validate budget if provided
    if (budget !== undefined && (typeof budget !== 'number' || budget <= 0)) {
      return response.error('Budget must be a positive number', 400)
    }

    // Validate status if provided
    const validStatuses = ['active', 'on_hold', 'completed', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return response.error('Invalid status value', 400)
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (project_number !== undefined) updates.project_number = project_number?.trim() || null
    if (budget !== undefined) updates.budget = budget
    if (status !== undefined) updates.status = status
    updates.updated_at = new Date().toISOString()

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return response.error('Project not found', 404)
      }
      console.error('Error updating project:', error)
      return response.error('Failed to update project', 500)
    }

    // Log activity
    await logActivity(
      profile.company_id,
      profile.id,
      'project',
      project.id,
      'update',
      { projectName: project.name, updates: Object.keys(updates) }
    )

    // Get project with summary
    const summary = await getProjectSummary(project.id, profile.company_id)
    const projectWithSummary = {
      ...project,
      summary: {
        totalOrders: summary.totalOrders,
        approvedOrders: summary.approvedOrders,
        pendingOrders: summary.pendingOrders,
        rejectedOrders: summary.rejectedOrders,
        totalExpenses: summary.totalExpenses,
        approvedExpenses: summary.approvedExpenses,
        pendingExpenses: summary.pendingExpenses,
        totalDeliveries: summary.totalDeliveries,
        completedDeliveries: summary.completedDeliveries,
        pendingDeliveries: summary.pendingDeliveries,
        totalSpent: summary.totalSpent,
        budgetRemaining: project.budget - summary.totalSpent,
        budgetUsedPercent: project.budget > 0 ? (summary.totalSpent / project.budget) * 100 : 0
      }
    }

    return response.success(projectWithSummary)
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error)
    return response.error('Internal server error', 500)
  }
}

// PATCH support for legacy compatibility
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params })
}

// DELETE /api/projects/[id] - Delete project (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    
    // Validate admin role
    if (!validateRole(profile, 'admin')) {
      return response.error('Only admins can delete projects', 403)
    }

    // Get project first to check if it exists and has related data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return response.error('Project not found', 404)
      }
      console.error('Error fetching project for deletion:', projectError)
      return response.error('Failed to fetch project', 500)
    }

    // Check if project has orders, expenses, or deliveries
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('project_id', params.id)
      .limit(1)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('project_id', params.id)
      .limit(1)

    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('id')
      .eq('project_id', params.id)
      .limit(1)

    if (orders?.length || expenses?.length || deliveries?.length) {
      return response.error('Cannot delete project with existing orders, expenses, or deliveries', 400)
    }

    // Delete project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id)
      .eq('company_id', profile.company_id)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return response.error('Failed to delete project', 500)
    }

    // Log activity
    await logActivity(
      profile.company_id,
      profile.id,
      'project',
      params.id,
      'delete',
      { projectName: project.name }
    )

    return response.success({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error)
    return response.error('Internal server error', 500)
  }
}
