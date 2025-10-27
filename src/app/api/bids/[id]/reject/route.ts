import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { logActivity } from '@/app/api/activity/route';

export async function POST(
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

    const { data: bid, error } = await supabase
      .from('bids')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity({
      type: 'bid',
      action: 'rejected',
      title: `Bid from "${bid.vendor_name}" rejected`,
      description: `Rejected bid: ${bid.item_description} - $${bid.total_amount}`,
      entity_type: 'bid',
      entity_id: bid.id,
      metadata: {
        vendor_name: bid.vendor_name,
        item_description: bid.item_description,
        total_amount: bid.total_amount,
        status: 'rejected',
      },
      status: 'failed',
      amount: bid.total_amount,
      user_id: user?.id,
      company_id: profile?.company_id,
    })

    return NextResponse.json(bid);
  } catch (error: any) {
    console.error('Error rejecting bid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject bid' },
      { status: 500 }
    );
  }
}
