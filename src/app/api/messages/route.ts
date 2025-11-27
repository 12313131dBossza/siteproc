import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET messages for a specific conversation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const channel = searchParams.get('channel');
    const deliveryId = searchParams.get('delivery_id');

    if (!projectId || !channel) {
      return NextResponse.json({ error: 'Missing project_id or channel' }, { status: 400 });
    }

    // Verify user belongs to company that owns this project
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('company_id')
      .eq('id', projectId)
      .single();

    if (!profile?.company_id || !project || project.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = adminClient
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .eq('channel', channel)
      .order('created_at', { ascending: true });

    if (deliveryId) {
      query = query.eq('delivery_id', deliveryId);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get sender names
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, username')
      .in('id', senderIds);

    const nameMap = new Map(
      (profiles || []).map(p => [p.id, p.full_name || p.username || 'Unknown'])
    );

    const enrichedMessages = (messages || []).map(m => ({
      ...m,
      sender_name: nameMap.get(m.sender_id) || 'Unknown',
    }));

    return NextResponse.json({ messages: enrichedMessages });
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST a new message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, channel, delivery_id, message } = body;

    if (!project_id || !channel || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user belongs to company that owns this project
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, full_name, username')
      .eq('id', user.id)
      .single();

    const { data: project } = await adminClient
      .from('projects')
      .select('company_id')
      .eq('id', project_id)
      .single();

    if (!profile?.company_id || !project || project.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the message
    const { data: newMessage, error: insertError } = await adminClient
      .from('project_messages')
      .insert({
        project_id,
        channel,
        delivery_id: delivery_id || null,
        sender_id: user.id,
        sender_type: 'company',
        message: message.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({
      message: {
        ...newMessage,
        sender_name: profile.full_name || profile.username || 'You',
      }
    });
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
