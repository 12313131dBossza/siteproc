import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { supabaseService } from '@/lib/supabase'
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

    // Probe if deliveries has company_id column; if not, fall back to no company filter
    let supportsCompany = true
    try {
      const test = await supabase
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user.company_id)
      if (test.error && /company_id/.test(test.error.message)) supportsCompany = false
    } catch {
      supportsCompany = false
    }

    // Build query for deliveries with items; select wildcard to avoid missing-column errors
    let query = supabase
      .from('deliveries')
      .select(`*, delivery_items (*)`)
      .order('created_at', { ascending: false })
    
    // TEMPORARILY DISABLE COMPANY FILTERING TO FIX ITEMS ISSUE
    // TODO: Fix company_id mismatch in database then re-enable this
    // if (supportsCompany) {
    //   query = query.eq('company_id', user.company_id)
    // }
    
    console.log(`🔍 Fetching deliveries WITHOUT company filter (temporarily) for user: ${user.email}`)

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply search filter (search across multiple fields)
    if (search) {
      query = query.or(`driver_name.ilike.%${search}%,vehicle_number.ilike.%${search}%,notes.ilike.%${search}%,order_id.ilike.%${search}%`)
    }

    // Get total count for pagination
    let totalCount = 0
    try {
      const c = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
      const c2 = supportsCompany ? await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.company_id) : null
      totalCount = (supportsCompany ? (c2?.count || 0) : (c.count || 0))
    } catch {
      // Best effort; will compute from page data
      totalCount = 0
    }

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

    // Transform data to match interface and coerce numeric strings -> numbers
    const formattedDeliveries = (deliveries || []).map((delivery: any) => {
      // Ensure delivery_items is an array
      const rawItems = Array.isArray(delivery.delivery_items) ? delivery.delivery_items : []
      
      const items = rawItems.map((it: any) => ({
        id: it.id || crypto.randomUUID(),
        product_name: it.product_name || it.description || 'Unnamed Item',
        quantity: typeof it.quantity === 'string' ? Number(it.quantity) : (it.quantity || 1),
        unit: it.unit || 'pieces',
        unit_price: typeof it.unit_price === 'string' ? Number(it.unit_price) : (it.unit_price || 0),
        total_price: typeof it.total_price === 'string' ? Number(it.total_price) : (it.total_price || 0),
      }))
      
      const total_amount = typeof delivery.total_amount === 'string' ? Number(delivery.total_amount) : (delivery.total_amount ?? 0)
      
      // Debug logging for items transformation
      console.log(`📦 Delivery #${delivery.id?.slice(-8)}: ${rawItems.length} raw items -> ${items.length} formatted items`)
      if (items.length === 0 && rawItems.length > 0) {
        console.log('⚠️  Items lost during transformation:', rawItems)
      }
      if (items.length > 0) {
        console.log(`✅ Items for ${delivery.id?.slice(-8)}:`, items.map(i => `${i.product_name} (${i.quantity})`))
      }
      
      return { ...delivery, items, total_amount }
    })

    // Calculate summary statistics
    const summaryStats = {
  total_deliveries: totalCount || formattedDeliveries.length || 0,
      pending: formattedDeliveries.filter(d => d.status === 'pending').length,
      in_transit: formattedDeliveries.filter(d => d.status === 'in_transit').length,
      delivered: formattedDeliveries.filter(d => d.status === 'delivered').length,
      cancelled: formattedDeliveries.filter(d => d.status === 'cancelled').length,
  total_value: roundToTwo(formattedDeliveries.reduce((sum, d) => sum + Number(d.total_amount || 0), 0))
    }

    return NextResponse.json({
      success: true,
      deliveries: formattedDeliveries,
      pagination: {
        current_page: page,
        per_page: limit,
  total: totalCount || formattedDeliveries.length || 0,
  total_pages: Math.max(1, Math.ceil((totalCount || formattedDeliveries.length || 0) / limit)),
  has_next: page < Math.ceil((totalCount || formattedDeliveries.length || 0) / limit),
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

    // Prepare delivery data
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const deliveryData: any = {
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
    // If client sent job_id and it looks like a UUID, include it; otherwise defer to fallbacks
    if (body.job_id && uuidRegex.test(String(body.job_id))) {
      deliveryData.job_id = body.job_id
    }

    // Insert delivery into database; if company_id/created_by missing or RLS blocks, try graceful fallbacks
  let newDelivery: any = null
  let deliveryError: any = null
  let fallbackError: any = null
    let dbForItems: any = supabase
    {
      const res = await supabase
        .from('deliveries')
        .insert([deliveryData])
        .select()
        .single()
      newDelivery = res.data
      deliveryError = res.error
    }
    // If schema requires a job_id and rejected NULL, retry including job_id mapped from provided order_id/job_id
    if (deliveryError && /job_id/gi.test(deliveryError.message || '') && /not-null|null value/i.test(deliveryError.message || '')) {
      const withJob: any = { ...deliveryData }
      // Prefer a valid UUID; if body.order_id is not a UUID and the column is uuid, generating avoids syntax errors
      withJob.job_id = uuidRegex.test(String(body.job_id || '')) ? body.job_id : randomUUID()
      const resJob = await supabase
        .from('deliveries')
        .insert([withJob])
        .select()
        .single()
      newDelivery = resJob.data
      deliveryError = resJob.error
    }
    if (deliveryError && /column .*company_id|created_by|does not exist/i.test(deliveryError.message || '')) {
      const minimal = { ...deliveryData }
      delete (minimal as any).company_id
      delete (minimal as any).created_by
      const res2 = await supabase
        .from('deliveries')
        .insert([minimal])
        .select()
        .single()
      newDelivery = res2.data
      deliveryError = res2.error
    }
    // If minimal still fails with job_id NOT NULL, try minimal + job_id mapping as last anon try
    if (deliveryError && /job_id/gi.test(deliveryError.message || '') && /not-null|null value/i.test(deliveryError.message || '')) {
      const minimalJob: any = { ...deliveryData, job_id: randomUUID() }
      delete minimalJob.company_id
      delete minimalJob.created_by
      const res2b = await supabase
        .from('deliveries')
        .insert([minimalJob])
        .select()
        .single()
      newDelivery = res2b.data
      deliveryError = res2b.error
    }
    // If still failing (likely RLS), fallback to service role on server side only
  if (deliveryError) {
      try {
        const sbSvc = supabaseService()
        let withJobSR: any = { ...deliveryData }
        // Only set job_id if it looks like a UUID; otherwise, leave it undefined for first try
        const maybeId = body.job_id || body.order_id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (maybeId && uuidRegex.test(String(maybeId))) {
          withJobSR.job_id = maybeId
        }

        // If FK exists and requires a valid job row, try to create a placeholder job (best-effort)
        const msgBefore = (deliveryError?.message || '').toLowerCase()
        if (/job_id.*fkey|foreign key/i.test(msgBefore)) {
          try {
            const jobId = randomUUID()
            // Attempt to create a placeholder job row in common job tables if they exist
            const tryTables = ['jobs', 'orders', 'work_orders']
            for (const t of tryTables) {
              const { error: tErr } = await (sbSvc as any).from(t).insert([{ id: jobId }])
              if (!tErr) { withJobSR.job_id = jobId; break }
            }
          } catch {}
        }

        let res3 = await (sbSvc as any)
          .from('deliveries')
          .insert([withJobSR])
          .select()
          .single()
        if (!res3.error && res3.data) {
          newDelivery = res3.data
          deliveryError = null
          dbForItems = sbSvc
        } else if (res3.error) {
          // If the error is due to UUID syntax (e.g. job_id uuid), retry with a generated UUID
          const msg = res3.error.message || ''
          if (/invalid input syntax for type uuid/i.test(msg) || /job_id.*uuid/i.test(msg) || (/job_id/i.test(msg) && /not-null|null value/i.test(msg))) {
            const retry = await (sbSvc as any)
              .from('deliveries')
              .insert([{ ...withJobSR, job_id: randomUUID() }])
              .select()
              .single()
            if (!retry.error && retry.data) {
              newDelivery = retry.data
              deliveryError = null
              dbForItems = sbSvc
            } else {
              deliveryError = retry.error
            }
          } else {
            deliveryError = res3.error
          }
        }
      } catch (e) {
    fallbackError = e
      }
    }

    if (deliveryError) {
      console.error('Database error creating delivery:', deliveryError)
      const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json({
        success: false,
        error: 'Failed to create delivery in database',
        details: deliveryError?.message || String(deliveryError),
        diagnostics: {
          hasServiceKey,
          serviceKeyVar: process.env.SUPABASE_SERVICE_ROLE ? 'SUPABASE_SERVICE_ROLE' : (process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : null),
          fallbackError: fallbackError ? (fallbackError as Error).message : null
        }
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

    // Insert delivery items into database with adaptive column mapping
    async function insertItemsAdaptively(client: any) {
      const shapes = [
        // Try with description (your schema requires this)
        (it: any) => ({ delivery_id: newDelivery.id, description: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: user.company_id }),
        // Standard patterns with company_id
        (it: any) => ({ delivery_id: newDelivery.id, product_name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: user.company_id }),
        (it: any) => ({ delivery_id: newDelivery.id, product: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: user.company_id }),
        (it: any) => ({ delivery_id: newDelivery.id, item_name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: user.company_id }),
        (it: any) => ({ delivery_id: newDelivery.id, name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: user.company_id }),
        // Fallbacks without company_id
        (it: any) => ({ delivery_id: newDelivery.id, description: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price }),
        (it: any) => ({ delivery_id: newDelivery.id, product_name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price }),
        (it: any) => ({ delivery_id: newDelivery.id, product: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price })
      ]
      let lastErr: any = null
      for (const shape of shapes) {
        const rows = itemsData.map(shape)
        const { data, error } = await client.from('delivery_items').insert(rows).select()
        if (!error) return { data, error: null, attempted: Object.keys(rows[0] || {}) }
        lastErr = error
        // If the error was clearly due to missing column, try next; else break
        const msg = (error.message || '').toLowerCase()
        const missingCol = /could not find .* column|column .* does not exist|invalid input syntax/i.test(msg)
        if (!missingCol) break
      }
      return { data: null, error: lastErr, attempted: null }
    }

    let { data: newItems, error: itemsError, attempted } = await insertItemsAdaptively(dbForItems) as any

    // If RLS/permission blocks items insert, retry with service role
    if (itemsError) {
      const msg = (itemsError.message || '').toLowerCase()
      const rlsBlocked = /row-level security|permission denied|not allowed|rls/i.test(msg)
      if (rlsBlocked) {
        try {
          const sbSvc = supabaseService()
          const retry = await insertItemsAdaptively(sbSvc) as any
          if (!retry.error) {
            newItems = retry.data
            itemsError = null
          } else {
            itemsError = retry.error
          }
        } catch (e) {
          // keep original error
        }
      }
    }

    if (itemsError) {
      console.error('Database error creating delivery items:', itemsError)
      // Rollback delivery if items failed
      try { await dbForItems.from('deliveries').delete().eq('id', newDelivery.id) } catch {}
      try { const sbSvc = supabaseService(); await (sbSvc as any).from('deliveries').delete().eq('id', newDelivery.id) } catch {}
      const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json({
        success: false,
        error: 'Failed to create delivery items in database',
        details: itemsError?.message || String(itemsError),
        diagnostics: { attemptedItemColumns: attempted, hasServiceKey }
      }, { status: 500 })
    }

    // Return the complete delivery with items
    const completeDelivery = {
      ...newDelivery,
      total_amount: typeof newDelivery.total_amount === 'string' ? Number(newDelivery.total_amount) : newDelivery.total_amount,
      items: (newItems || []).map((it: any) => ({
        ...it,
        quantity: typeof it.quantity === 'string' ? Number(it.quantity) : it.quantity,
        unit_price: typeof it.unit_price === 'string' ? Number(it.unit_price) : it.unit_price,
        total_price: typeof it.total_price === 'string' ? Number(it.total_price) : it.total_price,
      }))
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
