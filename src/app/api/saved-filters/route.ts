import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'

// GET /api/saved-filters - List all saved filters for current user
export async function GET(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module')

    let query = supabase
      .from('saved_filters')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (module) {
      query = query.eq('module', module)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching saved filters:', error)
      return NextResponse.json({ error: 'Failed to fetch saved filters' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })

  } catch (error) {
    console.error('Saved filters API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/saved-filters - Create a new saved filter
export async function POST(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { module, name, filters, is_default } = body

    // Validate required fields
    if (!module || !name || !filters) {
      return NextResponse.json({ 
        error: 'Missing required fields: module, name, filters' 
      }, { status: 400 })
    }

    // If setting as default, unset other defaults for this module first
    if (is_default) {
      await supabase
        .from('saved_filters')
        .update({ is_default: false })
        .eq('user_id', profile.id)
        .eq('module', module)
        .eq('is_default', true)
    }

    // Create the saved filter
    const { data, error } = await supabase
      .from('saved_filters')
      .insert({
        user_id: profile.id,
        company_id: profile.company_id,
        module,
        name,
        filters,
        is_default: is_default || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating saved filter:', error)
      return NextResponse.json({ error: 'Failed to create saved filter' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })

  } catch (error) {
    console.error('Saved filters POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
