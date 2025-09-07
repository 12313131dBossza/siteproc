import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// Role-based permissions
interface UserPermissions {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

function getRolePermissions(role: string): UserPermissions {
  const roleMap: Record<string, UserPermissions> = {
    'viewer': { canView: true, canCreate: false, canUpdate: false, canDelete: false },
    'member': { canView: true, canCreate: true, canUpdate: false, canDelete: false },
    'bookkeeper': { canView: true, canCreate: true, canUpdate: true, canDelete: true },
    'manager': { canView: true, canCreate: true, canUpdate: true, canDelete: true },
    'admin': { canView: true, canCreate: true, canUpdate: true, canDelete: true },
    'owner': { canView: true, canCreate: true, canUpdate: true, canDelete: true }
  }
  return roleMap[role] || { canView: true, canCreate: false, canUpdate: false, canDelete: false }
}

// Authentication helper
async function getAuthenticatedUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email,
    role: profile.role,
    company_id: profile.company_id,
    full_name: profile.full_name,
    permissions: getRolePermissions(profile.role)
  }
}

interface DeliveryItem {
  id: string
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

interface Delivery {
  id: string
  order_id: string
  delivery_date: string
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled'
  driver_name?: string
  vehicle_number?: string
  notes?: string
  total_amount: number
  items: DeliveryItem[]
  created_at: string
  updated_at: string
  created_by?: string
  company_id?: string
}

// Helper function for precise calculations
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100
}

// GET endpoint - Fetch deliveries from database with role-based access
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    if (!user.permissions.canView) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to view deliveries' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    
    console.log('Fetching deliveries from database:', { 
      user: user.email,
      role: user.role, 
      company_id: user.company_id,
      page, 
      limit, 
      status, 
      search 
    })

    // Create Supabase client for database operations
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Build query for deliveries with items
    let query = supabase
      .from('deliveries')
      .select(`
        id,
        order_id,
        delivery_date,
        status,
        driver_name,
        vehicle_number,
        notes,
        total_amount,
        created_at,
        updated_at,
        created_by,
        delivery_items (
          id,
          product_name,
          quantity,
          unit,
          unit_price,
          total_price
        )
      `)
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply search filter (search across multiple fields)
    if (search) {
      query = query.or(`driver_name.ilike.%${search}%,vehicle_number.ilike.%${search}%,notes.ilike.%${search}%,order_id.ilike.%${search}%`)
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.company_id)

    // Apply pagination
    const startIndex = (page - 1) * limit
    query = query.range(startIndex, startIndex + limit - 1)

    const { data: deliveries, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch deliveries from database',
        deliveries: [],
        pagination: { current_page: 1, per_page: 10, total: 0, total_pages: 0, has_next: false, has_prev: false },
        summary: { total_deliveries: 0, pending: 0, in_transit: 0, delivered: 0, cancelled: 0, total_value: 0 }
      }, { status: 500 })
    }

    // Transform data to match interface
    const formattedDeliveries = deliveries?.map(delivery => ({
      ...delivery,
      items: delivery.delivery_items || []
    })) || []

    // Calculate summary statistics
    const summaryStats = {
      total_deliveries: totalCount || 0,
      pending: formattedDeliveries.filter(d => d.status === 'pending').length,
      in_transit: formattedDeliveries.filter(d => d.status === 'in_transit').length,
      delivered: formattedDeliveries.filter(d => d.status === 'delivered').length,
      cancelled: formattedDeliveries.filter(d => d.status === 'cancelled').length,
      total_value: roundToTwo(formattedDeliveries.reduce((sum, d) => sum + Number(d.total_amount), 0))
    }

    return NextResponse.json({
      success: true,
      deliveries: formattedDeliveries,
      pagination: {
        current_page: page,
        per_page: limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit),
        has_next: page < Math.ceil((totalCount || 0) / limit),
        has_prev: page > 1
      },
      summary: summaryStats,
      user_info: {
        role: user.role,
        permissions: user.permissions,
        company_id: user.company_id
      }
    })

  } catch (error) {
    console.error('Delivery fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch deliveries',
      deliveries: [],
      pagination: { current_page: 1, per_page: 10, total: 0, total_pages: 0, has_next: false, has_prev: false },
      summary: { total_deliveries: 0, pending: 0, in_transit: 0, delivered: 0, cancelled: 0, total_value: 0 }
    }, { status: 500 })
  }
}

// POST endpoint - Create new delivery in database with role-based access
export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    if (!user.permissions.canCreate) {
      return NextResponse.json({ 
        success: false, 
        error: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} role cannot create deliveries. Contact your administrator.` 
      }, { status: 403 })
    }

    const body = await req.json()
    console.log('Creating delivery in database:', { 
      user_id: user.id, 
      role: user.role, 
      company_id: user.company_id,
      items_count: body.items?.length || 0
    })
    
    // Validation
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one delivery item is required' 
      }, { status: 400 })
    }

    // Validate each item
    for (const item of body.items) {
      if (!item.product_name || typeof item.product_name !== 'string' || item.product_name.trim().length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'All items must have a valid product name' 
        }, { status: 400 })
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'All items must have a positive quantity' 
        }, { status: 400 })
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'All items must have a valid unit price (>= 0)' 
        }, { status: 400 })
      }
    }

    // Calculate total with precise rounding
    const totalAmount = roundToTwo(
      body.items.reduce((sum: number, item: any) => {
        const itemTotal = roundToTwo(item.quantity * item.unit_price)
        return sum + itemTotal
      }, 0)
    )

    // Create Supabase client for database operations
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Prepare delivery data
    const deliveryData = {
      order_id: body.order_id || `ORD-${Date.now()}`,
      delivery_date: body.delivery_date || new Date().toISOString(),
      status: body.status || 'pending',
      driver_name: body.driver_name || null,
      vehicle_number: body.vehicle_number || null,
      notes: body.notes || null,
      total_amount: totalAmount,
      company_id: user.company_id,
      created_by: user.id
    }

    // Insert delivery into database
    const { data: newDelivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert([deliveryData])
      .select()
      .single()

    if (deliveryError) {
      console.error('Database error creating delivery:', deliveryError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create delivery in database'
      }, { status: 500 })
    }

    // Prepare delivery items data
    const itemsData = body.items.map((item: any) => ({
      delivery_id: newDelivery.id,
      product_name: item.product_name.trim(),
      quantity: item.quantity,
      unit: item.unit || 'pieces',
      unit_price: roundToTwo(item.unit_price),
      total_price: roundToTwo(item.quantity * item.unit_price)
    }))

    // Insert delivery items into database
    const { data: newItems, error: itemsError } = await supabase
      .from('delivery_items')
      .insert(itemsData)
      .select()

    if (itemsError) {
      console.error('Database error creating delivery items:', itemsError)
      // Rollback delivery if items failed
      await supabase.from('deliveries').delete().eq('id', newDelivery.id)
      return NextResponse.json({
        success: false,
        error: 'Failed to create delivery items in database'
      }, { status: 500 })
    }

    // Return the complete delivery with items
    const completeDelivery = {
      ...newDelivery,
      items: newItems || []
    }

    return NextResponse.json({
      success: true,
      delivery: completeDelivery,
      message: `Delivery created successfully by ${user.role}`,
      user_info: {
        role: user.role,
        permissions: user.permissions
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Delivery creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create delivery'
    }, { status: 500 })
  }
}
