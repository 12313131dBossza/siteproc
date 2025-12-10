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

    // Get suppliers from project_members with external_type='supplier'
    const { data: supplierMembers } = await sb
      .from('project_members')
      .select(`
        user_id,
        profiles:user_id (id, email, full_name)
      `)
      .eq('external_type', 'supplier')
      .eq('status', 'active')

    // Get unique suppliers
    const supplierMap = new Map<string, { id: string; email: string; full_name: string }>()
    
    if (supplierMembers) {
      for (const member of supplierMembers) {
        const profile = member.profiles as any
        if (profile && profile.id) {
          supplierMap.set(profile.id, {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || profile.email || 'Unknown'
          })
        }
      }
    }

    // Also get suppliers from previous assignments (in case they're not in project_members)
    const { data: previousAssignments } = await sb
      .from('supplier_assignments')
      .select(`
        supplier_id,
        profiles:supplier_id (id, email, full_name)
      `)
      .not('supplier_id', 'is', null)

    if (previousAssignments) {
      for (const assignment of previousAssignments) {
        const profile = assignment.profiles as any
        if (profile && profile.id && !supplierMap.has(profile.id)) {
          supplierMap.set(profile.id, {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || profile.email || 'Unknown'
          })
        }
      }
    }

    const suppliers = Array.from(supplierMap.values())
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

    return NextResponse.json({ suppliers })
  } catch (error: any) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
