import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: Get messages for a delivery (supplier ↔ company channel only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Not a supplier' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const deliveryId = searchParams.get('delivery_id');

    if (!deliveryId) {
      return NextResponse.json({ error: 'Delivery ID required' }, { status: 400 });
    }

    // Get delivery to get project_id
    const { data: delivery } = await adminClient
      .from('deliveries')
      .select('id, project_id')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Fetch messages for this delivery in the company_supplier channel
    const { data: messages, error: messagesError } = await adminClient
      .from('project_messages')
      .select(`
        id,
        message,
        sender_id,
        sender_type,
        created_at,
        is_read,
        sender:profiles!sender_id(full_name)
      `)
      .eq('project_id', delivery.project_id)
      .eq('delivery_id', deliveryId)
      .eq('channel', 'company_supplier')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Transform messages
    const transformedMessages = (messages || []).map(m => ({
      id: m.id,
      message: m.message,
      sender_type: m.sender_type,
      sender_name: (m.sender as any)?.full_name || 'Unknown',
      created_at: m.created_at,
      is_read: m.is_read,
    }));

    // Mark messages as read
    await adminClient
      .from('project_messages')
      .update({ is_read: true, read_at: new Date().toISOString(), read_by: user.id })
      .eq('project_id', delivery.project_id)
      .eq('delivery_id', deliveryId)
      .eq('channel', 'company_supplier')
      .neq('sender_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({ messages: transformedMessages });
  } catch (error: any) {
    console.error('Supplier messages GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Send a message (supplier → company)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Not a supplier' }, { status: 403 });
    }

    const body = await request.json();
    const { delivery_id, message } = body;

    if (!delivery_id || !message?.trim()) {
      return NextResponse.json({ error: 'Delivery ID and message required' }, { status: 400 });
    }

    // Get delivery to get project_id and company_id
    const { data: delivery } = await adminClient
      .from('deliveries')
      .select('id, project_id, projects:project_id(company_id)')
      .eq('id', delivery_id)
      .single();

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Insert message
    const { data: newMessage, error: insertError } = await adminClient
      .from('project_messages')
      .insert({
        project_id: delivery.project_id,
        company_id: (delivery.projects as any)?.company_id,
        sender_id: user.id,
        sender_type: 'supplier',
        channel: 'company_supplier',
        delivery_id: delivery_id,
        message: message.trim(),
      })
      .select(`
        id,
        message,
        sender_type,
        created_at,
        is_read
      `)
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: {
        ...newMessage,
        sender_name: profile?.full_name || 'Supplier',
      },
    });
  } catch (error: any) {
    console.error('Supplier messages POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
