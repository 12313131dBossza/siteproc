import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

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

    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete bid' },
      { status: 500 }
    );
  }
}
