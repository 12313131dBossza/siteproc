import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    
    const { data: contractor, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contractor);
  } catch (error: any) {
    console.error('Error fetching contractor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contractor' },
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

    const { data: contractor, error } = await supabase
      .from('contractors')
      .update({
        name: body.name,
        company_name: body.company_name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        specialty: body.specialty,
        status: body.status,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(contractor);
  } catch (error: any) {
    console.error('Error updating contractor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update contractor' },
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
      .from('contractors')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete contractor' },
      { status: 500 }
    );
  }
}
