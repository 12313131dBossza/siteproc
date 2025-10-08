import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();

    const { data: transactions, error } = await supabase
      .from('inventory_transactions')
      .select('*, profiles:performed_by(name, email)')
      .eq('product_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(transactions || []);
  } catch (error: any) {
    console.error('Error fetching inventory history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory history' },
      { status: 500 }
    );
  }
}
