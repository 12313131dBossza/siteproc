import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

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

    const { data: client, error } = await supabase
      .from('clients')
      .insert([{
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
        notes: body.notes
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    )
  }
}
