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

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .single()

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

    // Log activity
    await logActivity({
      type: 'client',
      action: 'updated',
      title: `Client "${client.name}" updated`,
      description: `Updated client: ${client.company || client.name}`,
      entity_type: 'client',
      entity_id: client.id,
      metadata: {
        client_name: client.name,
        company: client.company,
        status: client.status,
      },
      user_id: user?.id,
      company_id: profile?.company_id,
    })

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

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .single()

    // Get client info before deleting
    const { data: client } = await supabase
      .from('clients')
      .select('name, company')
      .eq('id', params.id)
      .single();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    // Log activity
    if (client) {
      await logActivity({
        type: 'client',
        action: 'deleted',
        title: `Client "${client.name}" deleted`,
        description: `Deleted client: ${client.company || client.name}`,
        entity_type: 'client',
        entity_id: params.id,
        metadata: {
          client_name: client.name,
          company: client.company,
        },
        user_id: user?.id,
        company_id: profile?.company_id,
      })
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}
