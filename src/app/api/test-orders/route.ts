import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

// Test endpoint to debug orders API
export async function GET() {
  try {
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get all purchase_orders for company
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects!inner(
          id,
          name,
          company_id
        )
      `)
      .eq('projects.company_id', profile?.company_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      ordersCount: orders?.length || 0,
      orders: orders || [],
      ordersError: ordersError,
      deploymentVersion: '2025-10-05-v3'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
