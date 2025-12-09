import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

// GET /api/companies - Get current user's company
export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
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
    
    // Use service role client to get company - use * to get all columns
    const admin = supabaseService()
    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()
    
    if (companyError) {
      console.error('GET company error:', companyError)
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }
    
    console.log('GET /api/companies - returning:', company)
    
    // Ensure currency and units have defaults if null
    return NextResponse.json({
      ...company,
      currency: company.currency || 'USD',
      units: company.units || 'imperial'
    })
  } catch (error: any) {
    console.error('GET /api/companies error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/companies - Update current user's company
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
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
    
    console.log('PATCH /api/companies - received:', { name, currency, units, company_id: profile.company_id })
    
    // Use service role client for update
    const admin = supabaseService()
    
    // Build update object - only include non-undefined values
    const updateData: Record<string, any> = {}
    if (name !== undefined && name !== null) updateData.name = name
    if (currency !== undefined && currency !== null) updateData.currency = currency
    if (units !== undefined && units !== null) updateData.units = units
    
    console.log('PATCH /api/companies - updating with:', updateData)
    
    // Try updating all fields
    const { data, error: updateError } = await admin
      .from('companies')
      .update(updateData)
      .eq('id', profile.company_id)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('PATCH company error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    console.log('PATCH /api/companies - updated to:', data)
    
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('PATCH /api/companies error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
