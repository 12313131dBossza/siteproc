import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

// Default permissions for full company members
const FULL_PERMISSIONS = {
  view_project: true,
  view_orders: true,
  view_expenses: true,
  view_payments: true,
  view_documents: true,
  edit_project: true,
  create_orders: true,
  upload_documents: true,
  invite_others: true,
}

// GET /api/projects/[id] - Get specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer()
    const serviceSb = createServiceClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    const isFullCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(profile.role || '')

    // Get project
    const { data: project, error } = await serviceSb
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !project) {
      console.error('❌ Error fetching project:', error)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access permission
    let userPermissions = FULL_PERMISSIONS
    let projectRole = 'owner'
    
    if (isFullCompanyMember && project.company_id === profile.company_id) {
      // Full company members have full access to their company's projects
      userPermissions = FULL_PERMISSIONS
      projectRole = profile.role || 'member'
    } else {
      // External viewers - check project_members for access
      const { data: membership } = await serviceSb
        .from('project_members')
        .select('role, permissions, status')
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 })
      }

      userPermissions = membership.permissions || {
        view_project: true,
        view_orders: true,
        view_expenses: false,
        view_payments: false,
        view_documents: true,
        edit_project: false,
        create_orders: false,
        upload_documents: false,
        invite_others: false,
      }
      projectRole = membership.role
    }

    // Map project_number to code for frontend compatibility
    const projectWithCode = {
      ...project,
      code: project.project_number,
      // Include user's permissions and role for this project
      userPermissions,
      userRole: projectRole,
    }

    console.log('✅ Project fetched:', projectWithCode.id, projectWithCode.name, 'Role:', projectRole)
    return NextResponse.json({ data: projectWithCode })
  } catch (error: any) {
    console.error('❌ Error in GET /api/projects/[id]:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Check if user can edit (admin, owner, manager, or project owner)
    const canEditRoles = ['admin', 'owner', 'manager', 'bookkeeper']
    if (!canEditRoles.includes(profile.role || '')) {
      return NextResponse.json({ error: 'You do not have permission to update this project' }, { status: 403 })
    }

    const body = await request.json()
    const { name, budget, status, project_number } = body

    // Validate budget if provided
    if (budget !== undefined && (typeof budget !== 'number' || budget < 0)) {
      return NextResponse.json({ error: 'Budget must be a non-negative number' }, { status: 400 })
    }

    // Validate status if provided
    const validStatuses = ['active', 'on_hold', 'completed', 'cancelled', 'closed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (project_number !== undefined) updates.project_number = project_number?.trim() || null
    if (budget !== undefined) updates.budget = budget
    if (status !== undefined) updates.status = status
    updates.updated_at = new Date().toISOString()

    // Update project
    const serviceSb = createServiceClient()
    const { data: project, error } = await serviceSb
      .from('projects')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      console.error('Error updating project:', error)
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Only admins/owners can delete projects
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Only admins can delete projects' }, { status: 403 })
    }

    const serviceSb = createServiceClient()

    // Get project first to check if it exists
    const { data: project, error: projectError } = await serviceSb
      .from('projects')
      .select('id, name')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if project has orders, expenses, or deliveries
    const { data: orders } = await serviceSb
      .from('orders')
      .select('id')
      .eq('project_id', params.id)
      .limit(1)

    const { data: expenses } = await serviceSb
      .from('expenses')
      .select('id')
      .eq('project_id', params.id)
      .limit(1)

    const { data: deliveries } = await serviceSb
      .from('deliveries')
      .select('id')
      .eq('project_id', params.id)
      .limit(1)

    if (orders?.length || expenses?.length || deliveries?.length) {
      return NextResponse.json({ 
        error: 'Cannot delete project with existing orders, expenses, or deliveries' 
      }, { status: 400 })
    }

    // Delete project
    const { error: deleteError } = await serviceSb
      .from('projects')
      .delete()
      .eq('id', params.id)
      .eq('company_id', profile.company_id)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
