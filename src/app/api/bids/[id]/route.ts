import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { logActivity } from '@/app/api/activity/route';

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    
    const { data: bid, error } = await supabase
      .from('bids')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!bid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(bid);
  } catch (error: any) {
    console.error('Error fetching bid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bid' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const body = await request.json();

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .single()

    const { data: bid, error } = await supabase
      .from('bids')
      .update({
        vendor_name: body.vendor_name,
        vendor_email: body.vendor_email,
        project_id: body.project_id || null,
        item_description: body.item_description,
        quantity: body.quantity,
        unit_price: body.unit_price,
        total_amount: body.total_amount,
        valid_until: body.valid_until,
        status: body.status,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      type: 'bid',
      action: 'updated',
      title: `Bid from "${bid.vendor_name}" updated`,
      description: `Updated bid: ${bid.item_description} - $${bid.total_amount}`,
      entity_type: 'bid',
      entity_id: bid.id,
      metadata: {
        vendor_name: bid.vendor_name,
        item_description: bid.item_description,
        total_amount: bid.total_amount,
        status: bid.status,
      },
      amount: bid.total_amount,
      user_id: user?.id,
      company_id: profile?.company_id,
    })

    return NextResponse.json(bid);
  } catch (error: any) {
    console.error('Error updating bid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update bid' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .single()

    // Get bid info before deleting
    const { data: bid } = await supabase
      .from('bids')
      .select('vendor_name, item_description, total_amount')
      .eq('id', params.id)
      .single();

    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    // Log activity
    if (bid) {
      await logActivity({
        type: 'bid',
        action: 'deleted',
        title: `Bid from "${bid.vendor_name}" deleted`,
        description: `Deleted bid: ${bid.item_description}`,
        entity_type: 'bid',
        entity_id: params.id,
        metadata: {
          vendor_name: bid.vendor_name,
          item_description: bid.item_description,
          total_amount: bid.total_amount,
        },
        amount: bid.total_amount,
        user_id: user?.id,
        company_id: profile?.company_id,
      })
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete bid' },
      { status: 500 }
    );
  }
}
