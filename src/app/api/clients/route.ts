import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { logActivity } from '@/app/api/activity/route'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Clients fetch error (RLS):', error)
      
      if (['admin', 'owner', 'manager'].includes(profile.role || '')) {
        const serviceSb = createServiceClient()
        const { data: fallbackClients, error: fallbackError } = await serviceSb
          .from('clients')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
        
        if (!fallbackError) return NextResponse.json(fallbackClients || [])
      }
      
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    return NextResponse.json(clients || [])
  } catch (error: any) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    const clientData = {
      name: body.name,
      company_name: body.company_name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      industry: body.industry,
      status: body.status || 'active',
      notes: body.notes,
      company_id: profile.company_id,
      created_by: user.id
    }

    let client
    let error

    const result = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    client = result.data
    error = result.error

    if (error && ['admin', 'owner', 'manager'].includes(profile.role || '')) {
      const serviceSb = createServiceClient()
      const fallbackResult = await serviceSb
        .from('clients')
        .insert([clientData])
        .select()
        .single()
      
      client = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create client' },
        { status: 500 }
      )
    }

    // Log activity
    await logActivity({
      type: 'client',
      action: 'created',
      title: `Client "${client.name}" created`,
      description: `Created new client: ${client.company_name || client.name}`,
      entity_type: 'client',
      entity_id: client.id,
      metadata: {
        client_name: client.name,
        company_name: client.company_name,
        email: client.email,
        status: client.status,
      },
      user_id: user.id,
      company_id: profile.company_id,
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    )
  }
}
