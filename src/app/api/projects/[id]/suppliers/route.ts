import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'

// GET: Get all suppliers for a specific project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
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

    // Get suppliers from project_members with external_type='supplier' for this project
    const { data: supplierMembers, error } = await sb
      .from('project_members')
      .select(`
        user_id,
        profiles:user_id (id, email, full_name)
      `)
      .eq('project_id', projectId)
      .eq('external_type', 'supplier')
      .eq('status', 'active') as { data: Array<{ user_id: string; profiles: { id: string; email: string; full_name: string } | null }> | null; error: any }

    if (error) {
      console.error('Error fetching project suppliers:', error)
      return NextResponse.json({ suppliers: [] })
    }

    // Build unique supplier list
    const suppliers: Array<{ id: string; email: string; full_name: string }> = []
    
    if (supplierMembers) {
      for (const member of supplierMembers) {
        const profile = member.profiles as any
        if (profile && profile.id) {
          suppliers.push({
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || profile.email || 'Unknown'
          })
        }
      }
    }

    // Sort by name
    suppliers.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

    return NextResponse.json({ suppliers })
  } catch (error: any) {
    console.error('Error fetching project suppliers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
