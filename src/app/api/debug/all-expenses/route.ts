import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await sbServer()
    
    console.log('=== CHECKING ALL EXPENSES ===')

    // Get user first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Get ALL expenses for this company (no filters)
    const { data: allExpenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all expenses:', error)
      return NextResponse.json({
        error: 'Database error',
        details: error.message
      }, { status: 500 })
    }

    console.log('Found total expenses:', allExpenses?.length || 0)
    console.log('Company ID:', profile.company_id)
    console.log('User ID:', user.id)

    // Also get recent expenses (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      companyId: profile.company_id,
      userId: user.id,
      totalExpenses: allExpenses?.length || 0,
      recentExpenses: recentExpenses?.length || 0,
      expenses: allExpenses || [],
      lastFew: allExpenses?.slice(0, 3) || []
    })

  } catch (error) {
    console.error('Check expenses failed:', error)
    return NextResponse.json({
      error: 'Check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}