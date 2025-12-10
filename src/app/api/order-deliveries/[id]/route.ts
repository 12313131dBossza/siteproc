import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseService } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { logActivity } from '@/app/api/activity/route'
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
    // Consultants cannot view deliveries or change any status
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

  // Check project_members to determine effective role
  // This handles cases where profile.role is 'viewer' but user is actually a supplier/contractor
  let effectiveRole = profile.role
  
  if (profile.role === 'viewer') {
    const sb = supabaseService()
    const { data: membership } = await sb
      .from('project_members')
      .select('external_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    
    const externalType = (membership as any)?.external_type
    if (externalType === 'supplier') {
      effectiveRole = 'supplier'
    } else if (externalType === 'contractor') {
      effectiveRole = 'contractor'
    } else if (externalType === 'client') {
      effectiveRole = 'client'
    } else if (externalType === 'consultant') {
      effectiveRole = 'consultant'
    } else if (externalType === 'other') {
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
}

// GET endpoint - Fetch single delivery
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Authentication check
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const deliveryId = id

    // Create Supabase client
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

    // Fetch delivery with items
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select(`
        *,
        delivery_items (
          id,
          product_name,
          quantity,
          unit,
          unit_price,
          total_price
        )
      `)
      .eq('id', deliveryId)
      .eq('company_id', user.company_id) // Ensure user can only view their company's deliveries
      .single()

    if (fetchError || !delivery) {
      return NextResponse.json({
        success: false,
        error: 'Delivery not found'
      }, { status: 404 })
    }

    // Format response
    const formattedDelivery = {
      ...delivery,
      items: delivery.delivery_items || []
    }

    return NextResponse.json(formattedDelivery, { status: 200 })

  } catch (error) {
    console.error('Delivery fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch delivery'
    }, { status: 500 })
  }
}

// PATCH endpoint - Update delivery status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Authentication check
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    if (!user.permissions.canUpdate) {
      return NextResponse.json({ 
        success: false, 
        error: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} role cannot update deliveries. Contact your administrator.` 
      }, { status: 403 })
    }

    const deliveryId = id
    const body = await req.json()

    // Extract fields to update
    const { status, order_id, driver_name, vehicle_number, delivery_date, notes, items } = body

    // If status is provided, validate it
    if (status) {
      const validStatuses = ['pending', 'partial', 'delivered']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid status. Must be one of: pending, partial, delivered'
        }, { status: 400 })
      }
    }

    console.log('Updating delivery:', { 
      deliveryId, 
      hasStatus: !!status,
      hasItems: !!items,
      user_id: user.id, 
      role: user.role 
    })

    // First check if delivery exists and its current status
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

    // Check current delivery status first
    const { data: currentDelivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('status, company_id')
      .eq('id', deliveryId)
      .single()

    if (fetchError || !currentDelivery) {
      return NextResponse.json({
        success: false,
        error: 'Delivery not found'
      }, { status: 404 })
    }

    // Check if delivery is already delivered (locked)
    if (currentDelivery.status === 'delivered') {
      return NextResponse.json({
        success: false,
        error: 'Cannot edit delivered deliveries. Delivered records are locked to maintain data integrity.'
      }, { status: 403 })
    }

    // Check company access
    if (currentDelivery.company_id !== user.company_id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied. You can only edit deliveries from your company.'
      }, { status: 403 })
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (status !== undefined) updateData.status = status
    if (order_id !== undefined) updateData.order_id = order_id
    if (driver_name !== undefined) updateData.driver_name = driver_name
    if (vehicle_number !== undefined) updateData.vehicle_number = vehicle_number
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date
    if (notes !== undefined) updateData.notes = notes

    // Calculate total amount from items if provided
    if (items && Array.isArray(items)) {
      const total = items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.unit_price)
      }, 0)
      updateData.total_amount = total
    }

    // Try to update with user context first
    let updateResult = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .eq('company_id', user.company_id) // Ensure user can only update their company's deliveries
      .select()
      .single()

    // If RLS blocks the update, try with service role
    if (updateResult.error) {
      try {
        const sbSvc = supabaseService()
        updateResult = await (sbSvc as any)
          .from('deliveries')
          .update(updateData)
          .eq('id', deliveryId)
          .select()
          .single()
      } catch (e) {
        // Keep original error
      }
    }

    if (updateResult.error) {
      console.error('Database error updating delivery:', updateResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update delivery',
        details: updateResult.error.message
      }, { status: 500 })
    }

    // Update delivery items if provided
    if (items && Array.isArray(items)) {
      try {
        // Delete existing items
        await supabase
          .from('delivery_items')
          .delete()
          .eq('delivery_id', deliveryId)

        // Insert new items
        const itemsToInsert = items.map((item: any) => ({
          delivery_id: deliveryId,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        }))

        const { error: itemsError } = await supabase
          .from('delivery_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error updating delivery items:', itemsError)
        }
      } catch (itemError) {
        console.error('Error updating delivery items:', itemError)
        // Don't fail the whole update if items fail
      }
    }

    // Log activity for delivery status changes
    if (status) {
      try {
        const statusLabels: Record<string, string> = {
          'pending': 'Pending',
          'partial': 'In Transit',
          'delivered': 'Delivered'
        }
        
        await logActivity({
          type: 'delivery',
          action: 'updated',
          title: `Delivery ${statusLabels[status] || status}`,
          description: `Delivery status changed to ${statusLabels[status] || status}${driver_name ? ` (Driver: ${driver_name})` : ''}`,
          metadata: {
            delivery_id: deliveryId,
            status: status,
            previous_status: currentDelivery.status,
            driver_name: driver_name || null,
            vehicle_number: vehicle_number || null
          }
        })
        console.log(`✅ Delivery activity logged successfully for status: ${status}`)
      } catch (activityError) {
        console.error('⚠️ Failed to log delivery activity:', activityError)
        // Don't fail the delivery update if activity logging fails
      }

      // Sync delivered deliveries to Zoho Books as Bills
      if (status === 'delivered' && user.company_id) {
        console.log(`🔄 Attempting Zoho sync for delivery ${deliveryId}...`)
        try {
          const zohoResult = await autoSyncDeliveryToZoho(user.company_id, deliveryId, 'delivered')
          console.log(`📊 Zoho sync result:`, JSON.stringify(zohoResult))
          if (zohoResult.synced) {
            console.log(`✅ Delivery synced to Zoho Books: ${zohoResult.zohoId}`)
          } else if (zohoResult.error) {
            console.log(`⚠️ Zoho sync skipped: ${zohoResult.error}`)
          }
        } catch (zohoError) {
          console.error('❌ Zoho sync error:', zohoError)
          // Don't fail - delivery was updated successfully
        }
      } else {
        console.log(`⏭️ Zoho sync skipped: status=${status}, company_id=${user.company_id}`)
      }
    }

    return NextResponse.json({
      success: true,
      delivery: updateResult.data,
      message: status ? `Delivery status updated to ${status}` : 'Delivery updated successfully',
      user_info: {
        role: user.role,
        permissions: user.permissions
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Delivery update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update delivery status'
    }, { status: 500 })
  }
}

// DELETE endpoint - Delete delivery (for admins/managers)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    if (!user.permissions.canDelete) {
      return NextResponse.json({ 
        success: false, 
        error: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} role cannot delete deliveries. Contact your administrator.` 
      }, { status: 403 })
    }

    const deliveryId = params.id

    console.log('Deleting delivery:', { 
      deliveryId, 
      user_id: user.id, 
      role: user.role 
    })

    // Create Supabase client
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

    // Check current delivery status first
    const { data: currentDelivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('status, company_id')
      .eq('id', deliveryId)
      .single()

    if (fetchError || !currentDelivery) {
      return NextResponse.json({
        success: false,
        error: 'Delivery not found'
      }, { status: 404 })
    }

    // Check if delivery is delivered (locked)
    if (currentDelivery.status === 'delivered') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete delivered deliveries. Delivered records are locked to maintain data integrity.'
      }, { status: 403 })
    }

    // Check company access
    if (currentDelivery.company_id !== user.company_id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied. You can only delete deliveries from your company.'
      }, { status: 403 })
    }

    // Try to delete with user context first
    let deleteResult = await supabase
      .from('deliveries')
      .delete()
      .eq('id', deliveryId)
      .eq('company_id', user.company_id) // Ensure user can only delete their company's deliveries

    // If RLS blocks the delete, try with service role
    if (deleteResult.error) {
      try {
        const sbSvc = supabaseService()
        deleteResult = await (sbSvc as any)
          .from('deliveries')
          .delete()
          .eq('id', deliveryId)
      } catch (e) {
        // Keep original error
      }
    }

    if (deleteResult.error) {
      console.error('Database error deleting delivery:', deleteResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete delivery',
        details: deleteResult.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery deleted successfully',
      user_info: {
        role: user.role,
        permissions: user.permissions
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Delivery delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete delivery'
    }, { status: 500 })
  }
}
