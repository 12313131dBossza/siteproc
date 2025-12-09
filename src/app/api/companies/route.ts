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
    
    // Use service role client to get company - select only known columns
    const admin = supabaseService()
    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name, created_at, currency, units')
      .eq('id', profile.company_id)
      .single()
    
    if (companyError) {
      // If currency/units columns don't exist in cache, try without them
      const { data: basicCompany, error: basicError } = await admin
        .from('companies')
        .select('id, name, created_at')
        .eq('id', profile.company_id)
        .single()
      
      if (basicError) {
        return NextResponse.json({ error: basicError.message }, { status: 500 })
      }
      
      return NextResponse.json({
        ...basicCompany,
        currency: 'USD',
        units: 'imperial'
      })
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
    
    // Use service role client for update
    const admin = supabaseService()
    
    // Try updating all fields first
    const { data, error: updateError } = await admin
      .from('companies')
      .update({ name, currency, units })
      .eq('id', profile.company_id)
      .select('id, name, created_at, currency, units')
      .single()
    
    if (updateError) {
      console.log('Full update failed:', updateError.message)
      
      // Fallback: update only name if schema cache is stale
      const { data: nameData, error: nameError } = await admin
        .from('companies')
        .update({ name })
        .eq('id', profile.company_id)
        .select('id, name, created_at')
        .single()
      
      if (nameError) {
        return NextResponse.json({ error: nameError.message }, { status: 500 })
      }
      
      return NextResponse.json({ 
        ok: true, 
        data: { ...nameData, currency: currency || 'USD', units: units || 'imperial' },
        warning: 'Some settings could not be saved. The schema cache may need to refresh - go to Supabase Dashboard > Project Settings > API and click "Reload Schema".'
      })
    }
    
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('PATCH /api/companies error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
    
    if (updateError) {
      // Check if error is about missing columns
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        // Try updating only the name field
        const { data: nameData, error: nameError } = await supabase
          .from('companies')
          .update({ name })
          .eq('id', profile.company_id)
          .select()
          .single()
        
        if (nameError) {
          return NextResponse.json({ error: nameError.message }, { status: 500 })
        }
        
        return NextResponse.json({ 
          ok: true, 
          data: nameData,
          warning: 'Some settings columns are not available. Please run the migration: ADD-COMPANY-SETTINGS-COLUMNS.sql'
        })
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('PATCH /api/companies error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
