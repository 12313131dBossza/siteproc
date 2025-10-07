import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, validateRole, getCompanyAdminEmails, response } from '@/lib/server-utils'
import { logActivity } from '@/app/api/activity/route'
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
    
    // Query with delivery progress fields explicitly included
    let query = supabase
      .from('purchase_orders')
      .select(`
        id,
        project_id,
        amount,
        description,
        category,
        vendor,
        product_name,
        quantity,
        unit_price,
        status,
        requested_by,
        requested_at,
        approved_by,
        approved_at,
        rejected_by,
        rejected_at,
        rejection_reason,
        created_at,
        updated_at,
        delivery_progress,
        ordered_qty,
        delivered_qty,
        remaining_qty,
        delivered_value,
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
    console.log('📥 Order creation request body:', body)
    
    // Support both formats: old (description/category) and new (vendor/product_name/qty/unit_price)
    let orderData: any = {}
    
    if (body.vendor && body.product_name && body.qty && body.unit_price) {
      // New format from AddItemModal
      const totalAmount = body.qty * body.unit_price
      orderData = {
        project_id: body.project_id,
        amount: totalAmount,
        description: `${body.product_name} (${body.qty} units @ $${body.unit_price})`,
        category: body.vendor,
        vendor: body.vendor,
        product_name: body.product_name,
        quantity: body.qty,
        unit_price: body.unit_price
      }
      console.log('✅ Using new format (vendor/product/qty/price)')
    } else if (body.amount && body.description && body.category) {
      // Old format (backwards compatibility)
      orderData = {
        project_id: body.project_id,
        amount: body.amount,
        description: body.description,
        category: body.category
      }
      console.log('✅ Using old format (amount/description/category)')
    } else {
      console.error('❌ Invalid order data:', body)
      return response.error('Either (vendor, product_name, qty, unit_price) or (amount, description, category) are required', 400)
    }

    const { project_id, amount } = orderData
    
    // Validate required fields
    if (!project_id) {
      return response.error('project_id is required', 400)
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
    // Note: purchase_orders gets company_id through project_id relationship, no need to store directly
    const insertData: any = {
      project_id,
      amount,
      description: orderData.description,
      category: orderData.category,
      status: 'pending',
      requested_by: profile.id,
      requested_at: new Date().toISOString()
    }
    
    // Add new fields if they exist
    if (orderData.vendor) insertData.vendor = orderData.vendor
    if (orderData.product_name) insertData.product_name = orderData.product_name
    if (orderData.quantity) insertData.quantity = orderData.quantity
    if (orderData.unit_price) insertData.unit_price = orderData.unit_price
    
    console.log('📝 Inserting order data:', insertData)
    
    const { data: order, error } = await supabase
      .from('purchase_orders')
      .insert(insertData)
      .select(`
        id,
        project_id,
        amount,
        description,
        category,
        vendor,
        product_name,
        quantity,
        unit_price,
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
    try {
      await logActivity({
        type: 'order',
        action: 'created',
        title: `Purchase Order Created`,
        description: `Order for ${description}`,
        entity_type: 'order',
        entity_id: order.id,
        metadata: { projectId: project_id, amount, description, category },
        status: 'success',
        amount: amount
      })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

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
