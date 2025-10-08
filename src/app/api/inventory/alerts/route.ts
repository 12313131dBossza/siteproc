import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved');

    let query = supabase
      .from('inventory_alerts')
      .select('*, products(name, category, stock_quantity, min_stock_level)')
      .order('created_at', { ascending: false });

    if (resolved === 'false') {
      query = query.eq('is_resolved', false);
    }

    const { data: alerts, error } = await query;

    if (error) throw error;

    return NextResponse.json(alerts || []);
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
