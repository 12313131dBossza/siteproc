import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, validateRole, logActivity, getCompanyAdminEmails, response } from '@/lib/server-utils'
import { sendOrderRequestNotification, sendOrderApprovalNotification, sendOrderRejectionNotification } from '@/lib/email'

// GET /api/orders - List orders for user's company
export async function GET(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return response.error(profileError || 'Unauthorized', 401)
    }
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    
    // Simplified query without complex joins that might fail
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('projects.company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return response.error('Failed to fetch orders', 500)
    }

    return response.success(orders)
  } catch (error) {
    console.error('Error in GET /api/orders:', error)
    return response.error('Internal server error', 500)
  }
}

// POST /api/orders - Create new order request
export async function POST(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return response.error(profileError || 'Unauthorized', 401)
    }
    
    const body = await request.json()
    const { project_id, amount, description, category } = body

    // Validate required fields
    if (!project_id || !amount || !description || !category) {
      return response.error('project_id, amount, description, and category are required', 400)
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return response.error('Amount must be a positive number', 400)
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .eq('id', project_id)
      .eq('company_id', profile.company_id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return response.error('Project not found', 404)
      }
      console.error('Error verifying project:', projectError)
      return response.error('Failed to verify project', 500)
    }

    // Create order using fresh purchase_orders table (bypasses stuck cache)
    const { data: order, error } = await supabase
      .from('purchase_orders')
      .insert({
        project_id,
        amount,
        description: description.trim(),
        category: category.trim(),
        status: 'pending',
        requested_by: profile.id,
        requested_at: new Date().toISOString()
      })
      .select(`
        id,
        project_id,
        amount,
        description,
        category,
        status,
        requested_by,
        requested_at,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating order:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to create order: ${error.message}`,
        message: `Failed to create order: ${error.message}`,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    // Log activity
    await logActivity(
      profile.company_id,
      profile.id,
      'order',
      order.id,
      'create',
      { projectId: project_id, amount, description, category }
    )

    // Send notification to admins
    try {
      const adminEmails = await getCompanyAdminEmails(profile.company_id)
      if (adminEmails.length > 0) {
        await sendOrderRequestNotification({
          orderId: order.id,
          projectName: project.name,
          companyName: profile.company?.name || 'Unknown Company',
          requestedBy: profile.full_name || 'Unknown User',
          requestedByEmail: profile.email || '',
          amount: order.amount,
          description: order.description,
          category: order.category,
          approverName: adminEmails[0], // Send to first admin
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project_id}`
        })
      }
    } catch (emailError) {
      console.error('Failed to send order request notification:', emailError)
      // Don't fail the request if email fails
    }

    return response.success(order, 201)
  } catch (error) {
    console.error('Error in POST /api/orders:', error)
    return response.error('Internal server error', 500)
  }
}
