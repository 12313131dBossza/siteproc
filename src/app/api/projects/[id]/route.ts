import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, validateRole, logActivity, getProjectSummary, response } from '@/lib/server-utils'

// GET /api/projects/[id] - Get specific project with summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    
    // Get project
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        budget,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      `)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return response.error('Project not found', 404)
      }
      console.error('Error fetching project:', error)
      return response.error('Failed to fetch project', 500)
    }

    // Get project summary
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
    console.error('Error in GET /api/projects/[id]:', error)
    return response.error('Internal server error', 500)
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
    const { name, description, budget, start_date, end_date, status } = body

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
    if (description !== undefined) updates.description = description?.trim() || null
    if (budget !== undefined) updates.budget = budget
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
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
