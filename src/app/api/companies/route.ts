import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// GET /api/companies - Get current user's company
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile to find their company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 404 })
    }
    
    // Get the company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()
    
    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }
    
    return NextResponse.json(company)
  } catch (error: any) {
    console.error('GET /api/companies error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/companies - Update current user's company
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile to find their company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 404 })
    }
    
    const body = await req.json().catch(() => ({}))
    const { name, currency, units } = body || {}
    
    // Update the company
    const { data, error: updateError } = await supabase
      .from('companies')
      .update({ name, currency, units })
      .eq('id', profile.company_id)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('PATCH /api/companies error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
