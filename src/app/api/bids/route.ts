import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: bids, error } = await supabase
      .from('bids')
      .select(`
        *,
        projects:project_id (name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to include project_name
    const transformedBids = (bids || []).map((bid: any) => ({
      ...bid,
      project_name: bid.projects?.name
    }))

    return NextResponse.json(transformedBids)
  } catch (error: any) {
    console.error('Error fetching bids:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bids' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer()
    const body = await request.json()

    const { data: bid, error } = await supabase
      .from('bids')
      .insert([{
        vendor_name: body.vendor_name,
        vendor_email: body.vendor_email,
        project_id: body.project_id || null,
        item_description: body.item_description,
        quantity: body.quantity,
        unit_price: body.unit_price,
        total_amount: body.total_amount,
        valid_until: body.valid_until,
        status: body.status || 'pending',
        notes: body.notes
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(bid, { status: 201 })
  } catch (error: any) {
    console.error('Error creating bid:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create bid' },
      { status: 500 }
    )
  }
}
