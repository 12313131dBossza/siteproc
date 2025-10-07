import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();

    const { data: bid, error } = await supabase
      .from('bids')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(bid);
  } catch (error: any) {
    console.error('Error approving bid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve bid' },
      { status: 500 }
    );
  }
}
