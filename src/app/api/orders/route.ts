import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, validateRole, getCompanyAdminEmails, response } from '@/lib/server-utils'
import { logActivity } from '@/app/api/activity/route'
import { sendOrderRequestNotification, sendOrderApprovalNotification, sendOrderRejectionNotification } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase-service'
import { autoSyncOrderToZoho } from '@/lib/zoho-autosync'

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
    const vendor = searchParams.get('vendor')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    const deliveryProgress = searchParams.get('delivery_progress')
    
    // Check if user is internal company member or external viewer
    const isInternalMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile.role || '')
    
    let orders: any[] = []
    
    if (isInternalMember) {
      // Internal members see all company orders
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          project_id,
          company_id,
          created_by,
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
          projects(
            id,
            name,
            company_id
          )
        `)
        .or(`company_id.eq.${profile.company_id},created_by.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      // Apply filters
      if (projectId) query = query.eq('project_id', projectId)
      if (status) query = query.eq('status', status)
      if (vendor) query = query.ilike('vendor', `%${vendor}%`)
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)
      if (minAmount) query = query.gte('amount', Number(minAmount))
      if (maxAmount) query = query.lte('amount', Number(maxAmount))
      if (deliveryProgress) query = query.eq('delivery_progress', deliveryProgress)

      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching orders (RLS):', error)
        // Service-role fallback for admins/managers/bookkeepers
        if (['admin', 'owner', 'manager', 'bookkeeper'].includes(profile.role || '')) {
          const serviceSb = createServiceClient()
          let fallbackQuery = serviceSb
            .from('purchase_orders')
            .select(`*`)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })
          
          if (projectId) fallbackQuery = fallbackQuery.eq('project_id', projectId)
          if (status) fallbackQuery = fallbackQuery.eq('status', status)
          
          const { data: fallbackData } = await fallbackQuery
          orders = fallbackData || []
        }
      } else {
        orders = data || []
      }
    } else {
      // External viewers - only see orders from their assigned projects
      console.log('🔍 Fetching orders for external viewer:', profile.id)
      
      const serviceSb = createServiceClient()
      
      // Get project IDs the user has access to with view_orders permission
      const { data: memberProjects } = await serviceSb
        .from('project_members')
        .select('project_id, permissions')
        .eq('user_id', profile.id)
        .eq('status', 'active')
      
      if (!memberProjects || memberProjects.length === 0) {
        console.log('External viewer has no project memberships')
        return NextResponse.json({ success: true, data: [] })
      }
      
      // Filter to projects where user has view_orders permission
      const projectIds = memberProjects
        .filter(m => {
          const perms = m.permissions as { view_orders?: boolean } | null
          return perms?.view_orders === true // Must explicitly have permission
        })
        .map(m => m.project_id)
      
      if (projectIds.length === 0) {
        console.log('External viewer has no projects with view_orders permission')
        return NextResponse.json({ success: true, data: [] })
      }
      
      console.log('External viewer can view orders for projects:', projectIds)
      
      // Fetch orders only from those projects
      let query = serviceSb
        .from('purchase_orders')
        .select(`*`)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (projectId) query = query.eq('project_id', projectId)
      if (status) query = query.eq('status', status)
      if (vendor) query = query.ilike('vendor', `%${vendor}%`)
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)
      if (minAmount) query = query.gte('amount', Number(minAmount))
      if (maxAmount) query = query.lte('amount', Number(maxAmount))
      if (deliveryProgress) query = query.eq('delivery_progress', deliveryProgress)
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching orders for viewer:', error)
        return response.error('Failed to fetch orders', 500)
      }
      
      orders = data || []
    }

    return NextResponse.json({ success: true, data: orders })
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
    
    // Support multiple formats for order creation
    let orderData: any = {}
    
    if (body.vendor && body.product_name && body.qty && body.unit_price) {
      // Format from AddItemModal (uses qty/unit_price)
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
      console.log('✅ Using AddItemModal format (vendor/product/qty/unit_price)')
    } else if (body.amount && body.description) {
      // Format from OrderForm (uses amount/description, optionally vendor)
      orderData = {
        project_id: body.project_id,
        amount: body.amount,
        description: body.description,
        category: body.category,
        vendor: body.vendor, // Include vendor from OrderForm!
        product_id: body.product_id,
        quantity: body.quantity,
        unit: body.unit,
      }
      console.log('✅ Using OrderForm format (amount/description/vendor)')
    } else {
      console.error('❌ Invalid order data:', body)
      return response.error('Either (vendor, product_name, qty, unit_price) or (amount, description) are required', 400)
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

    // Check if user is a full company member or has project-level permission
    const isFullCompanyMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile.role || '')
    
    if (!isFullCompanyMember) {
      // External user - check project_members for create_orders permission
      const serviceSb = createServiceClient()
      const { data: membership } = await serviceSb
        .from('project_members')
        .select('permissions')
        .eq('project_id', project_id)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .single()
      
      if (!membership?.permissions?.create_orders) {
        return response.error('You do not have permission to create orders on this project', 403)
      }
    }

    // Create order with company_id directly set
    const insertData: any = {
      project_id,
      company_id: profile.company_id,
      created_by: profile.id,
      amount,
      description: orderData.description,
      category: orderData.category,
      status: body.status || 'pending', // Respect user's status choice
      requested_by: profile.id,
      requested_at: new Date().toISOString()
    }
    
    // Add new fields if they exist
    if (orderData.vendor) insertData.vendor = orderData.vendor
    if (orderData.product_name) insertData.product_name = orderData.product_name
    if (orderData.quantity) insertData.quantity = orderData.quantity
    if (orderData.unit_price) insertData.unit_price = orderData.unit_price
    if (body.payment_terms) insertData.payment_terms = body.payment_terms
    
    // Store product_id for inventory deduction
    const product_id = body.product_id
    const order_quantity = body.quantity || orderData.quantity
    
    console.log('📝 Inserting order data:', insertData)
    
    let order
    let error
    
    // Try with normal RLS first
    const result = await supabase
      .from('purchase_orders')
      .insert(insertData)
      .select(`
        id,
        project_id,
        company_id,
        created_by,
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
    
    order = result.data
    error = result.error

    // Service-role fallback if RLS blocks
    if (error && ['admin', 'owner', 'manager', 'bookkeeper'].includes(profile.role || '')) {
      console.log('🔄 Using service-role fallback for order creation')
      
      const serviceSb = createServiceClient()
      const fallbackResult = await serviceSb
        .from('purchase_orders')
        .insert(insertData)
        .select(`
          id,
          project_id,
          company_id,
          created_by,
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
      
      order = fallbackResult.data
      error = fallbackResult.error
    }

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
        description: `Order for ${orderData.description}`,
        entity_type: 'order',
        entity_id: order.id,
        metadata: { projectId: project_id, amount, description: orderData.description, category: orderData.category },
        status: 'success',
        amount: amount
      })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    // Deduct inventory if product_id is provided
    if (product_id && order_quantity) {
      try {
        console.log(`📦 Deducting inventory: product_id=${product_id}, quantity=${order_quantity}`)
        
        const serviceSb = createServiceClient()
        
        // Get current stock
        const { data: product, error: fetchError } = await serviceSb
          .from('products')
          .select('stock, stock_quantity')
          .eq('id', product_id)
          .single()
        
        if (fetchError) {
          console.error('Failed to fetch product for inventory deduction:', fetchError)
        } else if (product) {
          // Use stock_quantity if available, otherwise use stock
          const currentStock = product.stock_quantity || product.stock || 0
          const newStock = Math.max(0, currentStock - order_quantity)
          
          console.log(`📊 Stock update: ${currentStock} -> ${newStock}`)
          
          // Update both stock fields to keep them in sync
          const { error: updateError } = await serviceSb
            .from('products')
            .update({ 
              stock: newStock,
              stock_quantity: newStock 
            })
            .eq('id', product_id)
          
          if (updateError) {
            console.error('Failed to update product inventory:', updateError)
          } else {
            console.log('✅ Inventory deducted successfully')
          }
        }
      } catch (inventoryError) {
        console.error('Error during inventory deduction:', inventoryError)
        // Don't fail the order creation if inventory update fails
      }
    } else {
      console.log('⏭️ Skipping inventory deduction - product_id:', product_id, 'order_quantity:', order_quantity)
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
