import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { supabaseService } from '@/lib/supabase'
import { logActivity } from '@/app/api/activity/route'
import { cookies } from 'next/headers'
import { updateOrderAndProjectActuals } from '@/lib/delivery-sync'
import { autoSyncDeliveryToZoho } from '@/lib/zoho-autosync'

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
    'client': { canView: true, canCreate: false, canUpdate: false, canDelete: false },
    // Consultants can view but cannot update anything (no status changes)
    'consultant': { canView: false, canCreate: false, canUpdate: false, canDelete: false },
    'member': { canView: true, canCreate: true, canUpdate: false, canDelete: false },
    // Suppliers and contractors can view and update (mark deliveries) but not create or delete
    'supplier': { canView: true, canCreate: false, canUpdate: true, canDelete: false },
    'contractor': { canView: true, canCreate: false, canUpdate: true, canDelete: false },
    'bookkeeper': { canView: true, canCreate: true, canUpdate: true, canDelete: true },
    'manager': { canView: true, canCreate: true, canUpdate: true, canDelete: true },
    'admin': { canView: true, canCreate: true, canUpdate: true, canDelete: true },
    'owner': { canView: true, canCreate: true, canUpdate: true, canDelete: true }
  }
  return roleMap[role] || { canView: true, canCreate: false, canUpdate: false, canDelete: false }
}

// Authentication helper
async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    
    const allCookies = cookieStore.getAll()
    console.log('[getAuthenticatedUser] Cookies available:', allCookies.length, allCookies.map(c => c.name))
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              console.error('[getAuthenticatedUser] Error setting cookies:', error)
            }
          }
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[getAuthenticatedUser] Auth error:', authError.message)
    }
    
    if (!user) {
      console.log('[getAuthenticatedUser] No user found, returning null')
      return null
    }

    console.log('[getAuthenticatedUser] User found:', user.email)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[getAuthenticatedUser] Profile error:', profileError?.message)
      
      // If profile doesn't exist, return user with default role
      console.log('[getAuthenticatedUser] Returning user without profile, using default role')
      return {
        id: user.id,
        email: user.email,
        role: 'member',
        company_id: null,
        full_name: user.email,
        permissions: getRolePermissions('member')
      }
    }

    // Check project_members to determine effective role
    // This handles cases where profile.role is 'viewer' but user is actually a supplier/contractor/consultant
    let effectiveRole = profile.role
    
    if (profile.role === 'viewer') {
      const sb = supabaseService()
      const { data: membership } = await sb
        .from('project_members')
        .select('external_type')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle() as { data: { external_type?: string } | null }
      
      if (membership?.external_type === 'supplier') {
        effectiveRole = 'supplier'
      } else if (membership?.external_type === 'contractor') {
        effectiveRole = 'contractor'
      } else if (membership?.external_type === 'client') {
        effectiveRole = 'client'
      } else if (membership?.external_type === 'consultant') {
        effectiveRole = 'consultant'
      } else if (membership?.external_type === 'other') {
        effectiveRole = 'consultant' // Other has same restrictions as consultant
      }
      
      console.log('[getAuthenticatedUser] Profile role is viewer, checked project_members. Effective role:', effectiveRole)
    }

    return {
      id: user.id,
      email: user.email,
      role: effectiveRole,
      company_id: profile.company_id,
      full_name: profile.full_name,
      permissions: getRolePermissions(effectiveRole)
    }
  } catch (error) {
    console.error('[getAuthenticatedUser] Exception:', error)
    return null
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
  status: 'pending' | 'partial' | 'delivered'
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
    console.log('[GET /api/order-deliveries] Request started')
    
    // Authentication check
    console.log('[GET /api/order-deliveries] Calling getAuthenticatedUser()')
    const user = await getAuthenticatedUser()
    
    if (!user) {
      console.error('[GET /api/order-deliveries] Auth failed - no user')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required',
        debug: 'getAuthenticatedUser() returned null'
      }, { status: 401 })
    }

    console.log('[GET /api/order-deliveries] User authenticated:', user.email, 'role:', user.role)

    if (!user.permissions.canView) {
      console.error('[GET /api/order-deliveries] Permission denied:', user.role)
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to view deliveries' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')))
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
      .select(`*, delivery_items (*), purchase_orders:order_id (id, vendor, description, product_name)`)
      .order('created_at', { ascending: false })
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SUPPLIER-SPECIFIC FILTERING: Only show deliveries assigned to the supplier
    // ═══════════════════════════════════════════════════════════════════════════════
    if (user.role === 'supplier') {
      console.log(`🚚 Supplier ${user.email}: Filtering to only assigned deliveries`)
      
      // Get supplier's assigned project IDs and delivery IDs from supplier_assignments
      const sb = supabaseService()
      const { data: assignments } = await sb
        .from('supplier_assignments')
        .select('project_id, delivery_id, order_id')
        .eq('supplier_id', user.id)
        .eq('status', 'active') as { data: Array<{ project_id?: string; delivery_id?: string; order_id?: string }> | null }
      
      if (assignments && assignments.length > 0) {
        const deliveryIds = assignments.filter(a => a.delivery_id).map(a => a.delivery_id as string)
        const projectIds = assignments.filter(a => a.project_id).map(a => a.project_id as string)
        const orderIds = assignments.filter(a => a.order_id).map(a => a.order_id as string)
        
        console.log(`🚚 Supplier assignments found:`, { deliveryIds, projectIds, orderIds })
        
        // Build OR filter for delivery_id, project_id, or order_id
        const filters: string[] = []
        if (deliveryIds.length > 0) filters.push(`id.in.(${deliveryIds.join(',')})`)
        if (projectIds.length > 0) filters.push(`project_id.in.(${projectIds.join(',')})`)
        if (orderIds.length > 0) filters.push(`order_id.in.(${orderIds.join(',')})`)
        
        if (filters.length > 0) {
          query = query.or(filters.join(','))
        } else {
          // No valid filters, return empty
          return NextResponse.json({
            success: true,
            deliveries: [],
            pagination: { current_page: 1, per_page: limit, total: 0, total_pages: 0, has_next: false, has_prev: false },
            summary: { total_deliveries: 0, pending: 0, partial: 0, delivered: 0, cancelled: 0, total_value: 0 },
            user_info: { role: user.role, permissions: user.permissions }
          })
        }
      } else {
        console.log(`🚚 Supplier ${user.email}: No assignments found, returning empty`)
        return NextResponse.json({
          success: true,
          deliveries: [],
          pagination: { current_page: 1, per_page: limit, total: 0, total_pages: 0, has_next: false, has_prev: false },
          summary: { total_deliveries: 0, pending: 0, partial: 0, delivered: 0, cancelled: 0, total_value: 0 },
          user_info: { role: user.role, permissions: user.permissions }
        })
      }
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // END SUPPLIER FILTERING
    // ═══════════════════════════════════════════════════════════════════════════════
    else {
      // Company filtering for non-suppliers - ensures users only see their company's deliveries
      const filterByCompany = supportsCompany && !!user.company_id
      if (filterByCompany) {
        // Include deliveries with matching company OR those created by the user (regardless of company_id)
        // This ensures users always see what they created, even if company assignment was missing/mismatched
        const orExpr = `company_id.eq.${user.company_id},created_by.eq.${user.id}`
        query = query.or(orExpr)
        console.log(`🔍 Fetching deliveries for company: ${user.company_id} OR created_by=${user.id}`)
      } else {
        // Fallback: show deliveries created by the current user if company_id is unavailable
        query = query.eq('created_by', user.id)
        console.log(`🔍 Fetching deliveries by creator fallback: ${user.id} (email: ${user.email})`)
      }
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply search filter (search across multiple fields)
    if (search) {
      query = query.or(`driver_name.ilike.%${search}%,vehicle_number.ilike.%${search}%,notes.ilike.%${search}%,order_id.ilike.%${search}%`)
    }

    // Get total count for pagination (skip for suppliers since we already filtered above)
    let totalCount = 0
    if (user.role !== 'supplier') {
      try {
        const filterByCompany = supportsCompany && !!user.company_id
        if (filterByCompany) {
          const orExpr = `company_id.eq.${user.company_id},created_by.eq.${user.id}`
          const c2 = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .or(orExpr)
          totalCount = c2.count ?? 0
        } else {
          const c3 = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', user.id)
          totalCount = c3.count || 0
        }
      } catch {
        // Best effort; will compute from page data
        totalCount = 0
      }
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
        summary: { total_deliveries: 0, pending: 0, partial: 0, delivered: 0, cancelled: 0, total_value: 0 }
      }, { status: 500 })
    }

  // Transform data to match interface and coerce numeric strings -> numbers
  let formattedDeliveries = (deliveries || []).map((delivery: any) => {
      // Ensure delivery_items is an array
      const rawItems = Array.isArray(delivery.delivery_items) ? delivery.delivery_items : []
      
      // Get supplier name from linked order if available
      const linkedOrder = delivery.purchase_orders || {}
      const supplierName = linkedOrder.vendor || null
      
      console.log(`🔍 DEBUG: Delivery ${delivery.id?.slice(-8)} has ${rawItems.length} raw items, linked order supplier: ${supplierName}`, rawItems.map(i => ({
        id: i.id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price
      })))
      
      const items = rawItems.map((it: any) => {
        // Handle the dual quantity fields (both 'quantity' and 'qty' exist)
        const itemQuantity = it.quantity || it.qty || 1
        const itemUnitPrice = it.unit_price || 0
        const itemTotalPrice = it.total_price || (itemQuantity * itemUnitPrice)
        
        const formattedItem = {
          id: it.id || crypto.randomUUID(),
          product_name: it.product_name || it.description || 'Unnamed Item',
          quantity: typeof itemQuantity === 'string' ? Number(itemQuantity) : itemQuantity,
          unit: it.unit || 'pieces',
          unit_price: typeof itemUnitPrice === 'string' ? Number(itemUnitPrice) : itemUnitPrice,
          total_price: typeof itemTotalPrice === 'string' ? Number(itemTotalPrice) : itemTotalPrice,
        }
        
        console.log('🔧 Item transformation:', {
          raw: { quantity: it.quantity, qty: it.qty, product_name: it.product_name, description: it.description },
          formatted: formattedItem
        })
        
        return formattedItem
      })
      // Temporarily remove the filter to debug
      // .filter(item => item.quantity > 0)
      
      const total_amount = typeof delivery.total_amount === 'string' ? Number(delivery.total_amount) : (delivery.total_amount ?? 0)
      
      // Extract proof_url from proof_urls array for frontend compatibility
      const proof_url = Array.isArray(delivery.proof_urls) && delivery.proof_urls.length > 0 
        ? delivery.proof_urls[0] 
        : null
      
      // Debug logging for items transformation
      console.log(`📦 Delivery #${delivery.id?.slice(-8)}: ${rawItems.length} raw items -> ${items.length} formatted items`)
      console.log(`📝 Formatted items:`, items.map(i => `${i.product_name}: ${i.quantity} ${i.unit} @ $${i.unit_price}`))
      if (items.length === 0 && rawItems.length > 0) {
        console.log('⚠️  Items lost during transformation:', rawItems)
      }
      if (items.length > 0) {
        console.log(`✅ Items for ${delivery.id?.slice(-8)}:`, items.map(i => `${i.product_name} (${i.quantity})`))
      }
      
      return { 
        ...delivery, 
        items, 
        total_amount, 
        proof_url,
        // Include supplier name from linked order for Zoho sync
        supplier_name: supplierName,
        order_vendor: supplierName
      }
    })

    // If nested items came back empty (likely due to RLS or missing grants), try a follow-up fetch and merge
    try {
      const needsBackfill = formattedDeliveries.some((d: any) => (d.items?.length || 0) === 0)
      if (needsBackfill && formattedDeliveries.length > 0) {
        const ids = formattedDeliveries.map((d: any) => d.id).filter(Boolean)
        console.log('🩹 Backfilling delivery items with direct query for deliveries:', ids.map((x: string) => x?.slice(-8)))

        // First attempt with user context (may be blocked by RLS)
        let itemsRes = await (supabase as any)
          .from('delivery_items')
          .select('*')
          .in('delivery_id', ids)

        // If blocked or zero, retry with service role on server
        if (itemsRes.error || (Array.isArray(itemsRes.data) && itemsRes.data.length === 0)) {
          try {
            const svc = supabaseService() as any
            itemsRes = await svc
              .from('delivery_items')
              .select('*')
              .in('delivery_id', ids)
          } catch (e) {
            console.log('Backfill service fallback failed:', (e as Error).message)
          }
        }

        if (Array.isArray(itemsRes.data) && itemsRes.data.length > 0) {
          const byDelivery: Record<string, any[]> = {}
          for (const it of itemsRes.data) {
            const did = it.delivery_id
            if (!byDelivery[did]) byDelivery[did] = []
            byDelivery[did].push({
              id: it.id,
              product_name: it.product_name || it.description || 'Unnamed Item',
              quantity: typeof it.quantity === 'string' ? Number(it.quantity) : it.quantity,
              unit: it.unit || 'pieces',
              unit_price: typeof it.unit_price === 'string' ? Number(it.unit_price) : it.unit_price,
              total_price: typeof it.total_price === 'string' ? Number(it.total_price) : (Number(it.quantity) * Number(it.unit_price))
            })
          }
          formattedDeliveries = formattedDeliveries.map((d: any) => {
            if (!d.items || d.items.length === 0) {
              const merged = byDelivery[d.id] || []
              if (merged.length > 0) {
                console.log(`✅ Backfilled ${merged.length} items for delivery ${d.id?.slice(-8)}`)
              }
              return { ...d, items: merged }
            }
            return d
          })
        } else {
          console.log('ℹ️ Backfill query returned no items or an error:', itemsRes.error?.message)
        }
      }
    } catch (e) {
      console.log('Backfill step skipped due to error:', (e as Error).message)
    }

    // Calculate summary statistics
    const summaryStats = {
  total_deliveries: totalCount || formattedDeliveries.length || 0,
      pending: formattedDeliveries.filter(d => d.status === 'pending').length,
      partial: formattedDeliveries.filter(d => d.status === 'partial').length,
      delivered: formattedDeliveries.filter(d => d.status === 'delivered').length,
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
      summary: { total_deliveries: 0, pending: 0, partial: 0, delivered: 0, cancelled: 0, total_value: 0 }
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
    
    // Get company_id - try user first, then fetch from order if needed
    let companyId = user.company_id
    if (!companyId && body.order_uuid && uuidRegex.test(String(body.order_uuid))) {
      console.log('📦 User has no company_id, fetching from order:', body.order_uuid)
      const sbSvc = supabaseService()
      const { data: orderData } = await sbSvc
        .from('purchase_orders')
        .select('company_id')
        .eq('id', body.order_uuid)
        .single() as { data: { company_id?: string } | null }
      if (orderData?.company_id) {
        companyId = orderData.company_id
        console.log('📦 Got company_id from order:', companyId)
      }
    }
    
    const deliveryData: any = {
      order_uuid: body.order_uuid || null,
      // order_id is a UUID foreign key - only set if provided and is valid UUID
      // For manual entries from projects, this will be null
      delivery_date: body.delivery_date || new Date().toISOString(),
      status: body.status || 'pending',
      driver_name: body.driver_name || null,
      vehicle_number: body.vehicle_number || null,
      notes: body.notes || null,
      total_amount: totalAmount,
      company_id: companyId,
      created_by: user.id,
      project_id: body.project_id || null, // Add project_id support
    }
    
    // Only set order_id if it's a valid UUID (references purchase_orders table)
    if (body.order_id && uuidRegex.test(String(body.order_id))) {
      deliveryData.order_id = body.order_id
    }
    
    // Handle proof of delivery - support both single proof_url and array proof_urls
    if (body.proof_url) {
      // Single URL from modal - store as array
      deliveryData.proof_urls = [body.proof_url]
    } else if (Array.isArray(body.proof_urls) && body.proof_urls.length > 0) {
      // Array format
      deliveryData.proof_urls = body.proof_urls
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
    let insertAttempt = 0
    console.log('📦 Attempting delivery insert with data:', JSON.stringify(deliveryData, null, 2))
    {
      insertAttempt++
      console.log(`📦 Insert attempt ${insertAttempt}: Standard insert`)
      const res = await supabase
        .from('deliveries')
        .insert([deliveryData])
        .select()
        .single()
      newDelivery = res.data
      deliveryError = res.error
      if (deliveryError) console.log(`❌ Attempt ${insertAttempt} failed:`, deliveryError.message)
      else console.log(`✅ Attempt ${insertAttempt} succeeded, delivery ID:`, newDelivery?.id)
    }
    // If insert failed due to missing column proof_urls, add it then retry once
    if (deliveryError && /column .*proof_urls.* does not exist/i.test(deliveryError.message || '')) {
      try {
        const sbSvc = supabaseService() as any
        await sbSvc.rpc('exec_sql', { sql: "ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_urls jsonb;" })
      } catch {}
      const resRetry = await supabase
        .from('deliveries')
        .insert([deliveryData])
        .select()
        .single()
      newDelivery = resRetry.data
      deliveryError = resRetry.error
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
        // Only set job_id if client supplied a valid UUID. Otherwise, prefer omitting it to avoid FK violations.
        const maybeId = body.job_id || body.order_id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        const clientProvidedValidJobId = !!maybeId && uuidRegex.test(String(maybeId))
        if (clientProvidedValidJobId) {
          withJobSR.job_id = maybeId
        } else {
          // Ensure we don't carry a bogus job_id into inserts
          delete (withJobSR as any).job_id
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
          // If we couldn't create a placeholder, avoid sending job_id at all
          if (!withJobSR.job_id) {
            delete (withJobSR as any).job_id
          }
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
            // Last resort: try again explicitly without job_id to avoid FK/UUID issues (if column allows NULL)
            const payload = { ...withJobSR }
            delete (payload as any).job_id
            const retry = await (sbSvc as any)
              .from('deliveries')
              .insert([payload])
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
    console.log('📦 Preparing delivery items:', body.items.length, 'items for delivery ID:', newDelivery.id)
    console.log('📦 Raw items from body:', JSON.stringify(body.items, null, 2))
    const itemsData = body.items.map((item: any) => ({
      delivery_id: newDelivery.id,
      product_name: (item.product_name || item.description || item.name || 'Unknown Item').trim(),
      quantity: item.quantity,
      unit: item.unit || 'pieces',
      unit_price: roundToTwo(item.unit_price),
      total_price: roundToTwo(item.quantity * item.unit_price)
    }))
    console.log('📦 Processed itemsData:', JSON.stringify(itemsData, null, 2))

    // Get company_id from the delivery or user (ensure we have a valid one)
    const itemsCompanyId = newDelivery.company_id || user.company_id
    console.log('📦 Items company_id:', itemsCompanyId, 'from delivery:', newDelivery.company_id, 'from user:', user.company_id)
    
    if (!itemsCompanyId) {
      console.error('❌ CRITICAL: No company_id available for items!')
    }

    // Insert delivery items into database with adaptive column mapping
    async function insertItemsAdaptively(client: any) {
      const shapes = [
        // Schema requires: description (NOT NULL) + company_id (NOT NULL)
        (it: any) => ({ delivery_id: newDelivery.id, description: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: itemsCompanyId }),
        // Fallback: maybe product_name instead of description
        (it: any) => ({ delivery_id: newDelivery.id, product_name: it.product_name, description: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: itemsCompanyId }),
        // Fallback: just product_name + company_id
        (it: any) => ({ delivery_id: newDelivery.id, product_name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, total_price: it.total_price, company_id: itemsCompanyId }),
      ]
      let lastErr: any = null
      let attemptNum = 0
      for (const shape of shapes) {
        attemptNum++
        const rows = itemsData.map(shape)
        console.log(`📦 Items insert attempt ${attemptNum} - Full row data:`, JSON.stringify(rows[0], null, 2))
        const { data, error } = await client.from('delivery_items').insert(rows).select()
        if (!error) {
          console.log(`✅ Items insert attempt ${attemptNum} succeeded, got ${data?.length} items`)
          return { data, error: null, attempted: Object.keys(rows[0] || {}) }
        }
        console.log(`❌ Items insert attempt ${attemptNum} failed:`, error.message, 'code:', error.code, 'details:', error.details)
        lastErr = error
        // If the error was clearly due to missing column, try next; else break
        const msg = (error.message || '').toLowerCase()
        const missingCol = /could not find .* column|column .* does not exist|invalid input syntax/i.test(msg)
        if (!missingCol) break
      }
      return { data: null, error: lastErr, attempted: null }
    }

    // Always try service role first for items to avoid RLS timing issues
    console.log('📦 Attempting items insert with service role to avoid RLS timing issues')
    const sbSvcForItems = supabaseService()
    let { data: newItems, error: itemsError, attempted } = await insertItemsAdaptively(sbSvcForItems) as any

    // If service role failed, try with normal client as fallback
    if (itemsError) {
      console.log('📦 Service role items insert failed, trying with user client...')
      const retry = await insertItemsAdaptively(dbForItems) as any
      if (!retry.error) {
        newItems = retry.data
        itemsError = null
        attempted = retry.attempted
      }
    }

    // If still failing with RLS error, keep trying
    if (itemsError) {
      const msg = (itemsError.message || '').toLowerCase()
      const rlsBlocked = /row-level security|permission denied|not allowed|rls/i.test(msg)
      if (rlsBlocked) {
        console.log('📦 Items insert blocked by RLS, retrying with service role...')
        try {
          const sbSvc = supabaseService()
          const retry = await insertItemsAdaptively(sbSvc) as any
          if (!retry.error) {
            console.log('✅ Service role retry succeeded')
            newItems = retry.data
            itemsError = null
          } else {
            console.log('❌ Service role retry failed:', retry.error.message)
            itemsError = retry.error
          }
        } catch (e) {
          console.log('❌ Service role retry exception:', (e as Error).message)
          // keep original error
        }
      }
    }

    if (itemsError) {
      console.error('❌ DELIVERY ITEMS FAILED - ROLLING BACK DELIVERY:', itemsError.message)
      console.error('📦 Full items error:', itemsError)
      // Rollback delivery if items failed
      try { 
        await dbForItems.from('deliveries').delete().eq('id', newDelivery.id) 
        console.log('🗑️ Rolled back delivery ID:', newDelivery.id)
      } catch (e) {
        console.log('⚠️ Rollback with dbForItems failed:', (e as Error).message)
      }
      try { 
        const sbSvc = supabaseService()
        await (sbSvc as any).from('deliveries').delete().eq('id', newDelivery.id)
        console.log('🗑️ Rolled back delivery with service role')
      } catch (e) {
        console.log('⚠️ Rollback with service role failed:', (e as Error).message)
      }
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

    // Sync order delivery_progress after creating delivery
    if (user.company_id && newDelivery.id) {
      try {
        await updateOrderAndProjectActuals(
          newDelivery.id,
          user.company_id,
          user.id
        )
        console.log('✅ Synced order delivery_progress after delivery creation')
      } catch (syncError) {
        console.error('Failed to sync order delivery_progress:', syncError)
        // Don't fail the request, delivery was created successfully
      }
    }

    // Log activity for delivery creation
    try {
      await logActivity({
        type: 'delivery',
        action: 'created',
        title: `Delivery Created`,
        description: `Delivery #${newDelivery.id} for Order ${body.order_id} - ${body.items.length} item(s)`,
        entity_type: 'delivery',
        entity_id: newDelivery.id,
        metadata: {
          order_id: body.order_id,
          order_uuid: body.order_uuid,
          items_count: body.items.length,
          driver_name: body.driver_name,
          vehicle_number: body.vehicle_number,
          status: body.status || 'pending'
        },
        status: 'success',
        amount: totalAmount
      })
    } catch (logError) {
      console.error('Failed to log delivery activity:', logError)
    }

    // Sync to Zoho Books if delivery is created as "delivered"
    const deliveryStatus = body.status || 'pending'
    if (deliveryStatus === 'delivered' && (newDelivery.company_id || user.company_id)) {
      const companyIdForZoho = newDelivery.company_id || user.company_id
      console.log(`🔄 Delivery created as 'delivered', syncing to Zoho...`)
      try {
        const zohoResult = await autoSyncDeliveryToZoho(companyIdForZoho, newDelivery.id, 'delivered')
        console.log(`📊 Zoho sync result:`, JSON.stringify(zohoResult))
        if (zohoResult.synced) {
          console.log(`✅ Delivery synced to Zoho Books as Bill: ${zohoResult.zohoId}`)
        } else if (zohoResult.error) {
          console.log(`⚠️ Zoho sync skipped: ${zohoResult.error}`)
        }
      } catch (zohoError) {
        console.error('❌ Zoho sync error:', zohoError)
        // Don't fail - delivery was created successfully
      }
    } else {
      console.log(`⏭️ Zoho sync skipped on create: status=${deliveryStatus}, will sync when marked delivered`)
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
      error: 'Failed to create delivery',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
