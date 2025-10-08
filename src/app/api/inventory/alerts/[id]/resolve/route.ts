import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();

    const { data: alert, error } = await supabase
      .from('inventory_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(alert);
  } catch (error: any) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
