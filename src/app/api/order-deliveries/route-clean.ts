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
  const cookieStore = await cookies()
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

// Mock data generator
function generateMockDeliveries(page: number = 1, limit: number = 10, companyId?: string): Delivery[] {
  const statuses: Delivery['status'][] = ['pending', 'in_transit', 'delivered', 'cancelled']
  const products = [
    { name: 'Portland Cement 50kg', unit: 'bags', basePrice: 12.50 },
    { name: 'Steel Rebar 12mm', unit: 'pieces', basePrice: 8.75 },
    { name: 'Concrete Blocks 200x100x400mm', unit: 'pieces', basePrice: 3.25 },
    { name: 'Sand (Fine)', unit: 'cubic meters', basePrice: 25.00 },
    { name: 'Gravel 20mm', unit: 'cubic meters', basePrice: 30.00 },
    { name: 'Lumber 2x4x12ft', unit: 'pieces', basePrice: 15.50 },
    { name: 'Plywood 18mm 4x8ft', unit: 'sheets', basePrice: 45.00 },
    { name: 'Roofing Tiles Clay', unit: 'pieces', basePrice: 2.75 }
  ]
  
  const drivers = ['John Smith', 'Maria Garcia', 'Ahmed Hassan', 'Li Wei', 'Sarah Johnson']
  const vehicles = ['TRK-001', 'TRK-002', 'VAN-003', 'TRK-004', 'VAN-005']

  const deliveries: Delivery[] = []
  const startIndex = (page - 1) * limit

  for (let i = startIndex; i < startIndex + limit; i++) {
    const itemCount = Math.floor(Math.random() * 3) + 1
    const items: DeliveryItem[] = []
    let totalAmount = 0

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)]
      const quantity = Math.floor(Math.random() * 20) + 1
      const priceVariation = (Math.random() * 4) - 2 // +/- $2 variation
      const unitPrice = roundToTwo(product.basePrice + priceVariation)
      const totalPrice = roundToTwo(quantity * unitPrice)

      items.push({
        id: `item_${i + 1}_${j + 1}`,
        product_name: product.name,
        quantity,
        unit: product.unit,
        unit_price: unitPrice,
        total_price: totalPrice
      })

      totalAmount += totalPrice
    }

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() - Math.floor(Math.random() * 30))

    deliveries.push({
      id: `delivery_${i + 1}`,
      order_id: `ORD-${String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0')}`,
      delivery_date: deliveryDate.toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      driver_name: drivers[Math.floor(Math.random() * drivers.length)],
      vehicle_number: vehicles[Math.floor(Math.random() * vehicles.length)],
      notes: Math.random() > 0.5 ? 'Delivery completed successfully' : undefined,
      total_amount: roundToTwo(totalAmount),
      items,
      created_at: deliveryDate.toISOString(),
      updated_at: deliveryDate.toISOString(),
      company_id: companyId,
      created_by: `user_${Math.floor(Math.random() * 5) + 1}`
    })
  }

  return deliveries
}

// GET endpoint - Fetch deliveries with role-based access
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
    
    console.log('Fetching deliveries:', { 
      user: user.email,
      role: user.role, 
      company_id: user.company_id,
      page, 
      limit, 
      status, 
      search 
    })

    // Generate mock data with company context
    const allMockDeliveries = generateMockDeliveries(1, 50, user.company_id)
    
    let filteredDeliveries = allMockDeliveries
    
    // Apply status filter
    if (status && status !== 'all') {
      filteredDeliveries = filteredDeliveries.filter(d => d.status === status)
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredDeliveries = filteredDeliveries.filter(d => 
        d.driver_name?.toLowerCase().includes(searchLower) ||
        d.vehicle_number?.toLowerCase().includes(searchLower) ||
        d.notes?.toLowerCase().includes(searchLower) ||
        d.order_id.toLowerCase().includes(searchLower) ||
        d.items.some(item => item.product_name.toLowerCase().includes(searchLower))
      )
    }

    // Pagination
    const totalCount = filteredDeliveries.length
    const startIndex = (page - 1) * limit
    const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + limit)
    
    // Summary statistics
    const summaryStats = {
      total_deliveries: totalCount,
      pending: filteredDeliveries.filter(d => d.status === 'pending').length,
      in_transit: filteredDeliveries.filter(d => d.status === 'in_transit').length,
      delivered: filteredDeliveries.filter(d => d.status === 'delivered').length,
      cancelled: filteredDeliveries.filter(d => d.status === 'cancelled').length,
      total_value: roundToTwo(filteredDeliveries.reduce((sum, d) => sum + d.total_amount, 0))
    }

    return NextResponse.json({
      success: true,
      deliveries: paginatedDeliveries,
      pagination: {
        current_page: page,
        per_page: limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
        has_next: page < Math.ceil(totalCount / limit),
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

// POST endpoint - Create new delivery with role-based access
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
    console.log('Creating delivery:', { 
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

    const newDelivery: Delivery = {
      id: crypto.randomUUID(),
      order_id: body.order_id || `ORD-${Date.now()}`,
      delivery_date: body.delivery_date || new Date().toISOString(),
      status: body.status || 'pending',
      driver_name: body.driver_name || '',
      vehicle_number: body.vehicle_number || '',
      notes: body.notes || '',
      total_amount: totalAmount,
      items: body.items.map((item: any) => ({
        id: crypto.randomUUID(),
        product_name: item.product_name.trim(),
        quantity: item.quantity,
        unit: item.unit || 'pieces',
        unit_price: roundToTwo(item.unit_price),
        total_price: roundToTwo(item.quantity * item.unit_price)
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
      company_id: user.company_id
    }

    return NextResponse.json({
      success: true,
      delivery: newDelivery,
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
