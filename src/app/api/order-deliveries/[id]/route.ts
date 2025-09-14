import { NextRequest, NextResponse } from 'next/server'
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

// PATCH endpoint - Update delivery status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    const deliveryId = params.id
    const body = await req.json()
    const { status } = body

    // Validate status
    const validStatuses = ['pending', 'in_transit', 'delivered', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status. Must be one of: pending, in_transit, delivered, cancelled'
      }, { status: 400 })
    }

    console.log('Updating delivery status:', { 
      deliveryId, 
      status, 
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

    // Try to update with user context first
    let updateResult = await supabase
      .from('deliveries')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
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
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
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
        error: 'Failed to update delivery status',
        details: updateResult.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      delivery: updateResult.data,
      message: `Delivery status updated to ${status}`,
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
