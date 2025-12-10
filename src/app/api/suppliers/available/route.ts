import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'

// GET: Get all users who can be assigned as suppliers
// This includes users with role='viewer' and external_type='supplier' in project_members
// OR users who have been previously assigned as suppliers
export async function GET(req: NextRequest) {
  try {
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
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!['admin', 'owner', 'manager', 'member'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const sb = supabaseService()
    const supplierIds = new Set<string>()

    // Get supplier user_ids from project_members with external_type='supplier'
    const { data: supplierMembers } = await sb
      .from('project_members')
      .select('user_id')
      .eq('external_type', 'supplier')
      .eq('status', 'active')

    if (supplierMembers) {
      supplierMembers.forEach(m => supplierIds.add(m.user_id))
    }

    // Also get supplier_ids from previous assignments
    const { data: previousAssignments } = await sb
      .from('supplier_assignments')
      .select('supplier_id')
      .not('supplier_id', 'is', null)

    if (previousAssignments) {
      previousAssignments.forEach(a => {
        if (a.supplier_id) supplierIds.add(a.supplier_id)
      })
    }

    // Also include all viewer role users as potential suppliers
    const { data: viewerUsers } = await sb
      .from('profiles')
      .select('id')
      .eq('role', 'viewer')

    if (viewerUsers) {
      viewerUsers.forEach(v => supplierIds.add(v.id))
    }

    // If no suppliers found, return empty
    if (supplierIds.size === 0) {
      return NextResponse.json({ suppliers: [] })
    }

    // Get profiles for all supplier IDs
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, email, full_name')
      .in('id', Array.from(supplierIds))

    const suppliers = (profiles || []).map(p => ({
      id: p.id,
      email: p.email || '',
      full_name: p.full_name || p.email || 'Unknown'
    }))

    // Sort by name
    suppliers.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

    return NextResponse.json({ suppliers })
  } catch (error: any) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
