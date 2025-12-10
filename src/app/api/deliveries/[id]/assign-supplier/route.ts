import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'

// GET: Get current supplier assignment for a delivery
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current assignment
    const sb = supabaseService()
    const { data: assignment, error } = await sb
      .from('supplier_assignments')
      .select('id, supplier_id, delivery_id, status')
      .eq('delivery_id', deliveryId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('Error fetching assignment:', error)
      return NextResponse.json({ assignment: null })
    }

    // If we have an assignment, get the supplier profile
    if (assignment && assignment.supplier_id) {
      const { data: profile } = await sb
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignment.supplier_id)
        .single()

      return NextResponse.json({ 
        assignment: {
          ...assignment,
          supplier: profile
        }
      })
    }

    return NextResponse.json({ assignment: null })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Assign a supplier to a delivery
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params
    const body = await req.json()
    const { supplier_id } = body

    if (!supplier_id) {
      return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role - only admin/manager/owner can assign
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!['admin', 'owner', 'manager'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const sb = supabaseService()

    // Deactivate any existing assignment for this delivery
    await sb
      .from('supplier_assignments')
      .update({ status: 'inactive' })
      .eq('delivery_id', deliveryId)
      .eq('status', 'active')

    // Create new assignment
    const { data: assignment, error } = await sb
      .from('supplier_assignments')
      .insert({
        supplier_id,
        delivery_id: deliveryId,
        status: 'active',
        company_id: profile?.company_id
      })
      .select('id, supplier_id, delivery_id, status')
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get supplier profile
    const { data: supplierProfile } = await sb
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', supplier_id)
      .single()

    return NextResponse.json({ 
      success: true, 
      assignment: {
        ...assignment,
        supplier: supplierProfile
      },
      message: 'Supplier assigned successfully'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove supplier assignment from a delivery
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['admin', 'owner', 'manager'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const sb = supabaseService()

    // Deactivate assignment
    const { error } = await sb
      .from('supplier_assignments')
      .update({ status: 'inactive' })
      .eq('delivery_id', deliveryId)
      .eq('status', 'active')

    if (error) {
      console.error('Error removing assignment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supplier assignment removed'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
