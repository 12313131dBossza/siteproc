import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client' },
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

    const { data: client, error } = await supabase
      .from('clients')
      .update({
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        industry: body.industry,
        status: body.status,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update client' },
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
      .from('clients')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}
