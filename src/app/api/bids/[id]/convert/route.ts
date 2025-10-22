import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();

    // Get the user's profile to get their company_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    // Get the bid details
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bidError) throw bidError;

    if (!bid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Create a purchase order from the bid
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert([{
        company_id: profile.company_id,
        created_by: user.id,
        project_id: bid.project_id,
        amount: bid.total_amount,
        description: bid.item_description,
        category: bid.vendor_name,
        vendor: bid.vendor_name,
        product_name: bid.item_description,
        quantity: bid.quantity,
        unit_price: bid.unit_price,
        status: 'pending',
        requested_by: user.id,
        requested_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Update the bid status to converted and link to order
    const { data: updatedBid, error: updateError } = await supabase
      .from('bids')
      .update({
        status: 'converted',
        order_id: order.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      bid: updatedBid,
      order_id: order.id,
      message: 'Bid converted to order successfully'
    });
  } catch (error: any) {
    console.error('Error converting bid to order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert bid to order' },
      { status: 500 }
    );
  }
}
