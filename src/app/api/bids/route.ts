import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { logActivity } from '@/app/api/activity/route'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await sbServer()
    
    const { data: bids, error } = await supabase
      .from('bids')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(bids || [])
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

    // Get the user's profile to get their company_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 })
    }

    const { data: bid, error } = await supabase
      .from('bids')
      .insert([{
        company_id: profile.company_id,
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

    // Log activity
    await logActivity({
      type: 'bid',
      action: 'created',
      title: `Bid from "${bid.vendor_name}" created`,
      description: `Created new bid: ${bid.item_description} - $${bid.total_amount}`,
      entity_type: 'bid',
      entity_id: bid.id,
      metadata: {
        vendor_name: bid.vendor_name,
        vendor_email: bid.vendor_email,
        item_description: bid.item_description,
        total_amount: bid.total_amount,
        status: bid.status,
      },
      amount: bid.total_amount,
      user_id: user.id,
      company_id: profile.company_id,
    })

    return NextResponse.json(bid, { status: 201 })
  } catch (error: any) {
    console.error('Error creating bid:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create bid' },
      { status: 500 }
    )
  }
}
