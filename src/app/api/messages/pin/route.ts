import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET pinned messages for a project/channel
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

    if (!projectId || !channel) {
      return NextResponse.json({ error: 'Missing project_id or channel' }, { status: 400 });
    }

    const { data: pinned, error } = await adminClient
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .eq('channel', channel)
      .eq('is_pinned', true)
      .is('deleted_at', null)
      .order('pinned_at', { ascending: false });

    if (error) {
      console.error('Error fetching pinned messages:', error);
      return NextResponse.json({ error: 'Failed to fetch pinned messages' }, { status: 500 });
    }

    // Get sender names
    const senderIds = [...new Set((pinned || []).map(m => m.sender_id))];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, username')
      .in('id', senderIds);

    const nameMap = new Map(
      (profiles || []).map(p => [p.id, p.full_name || p.username || 'Unknown'])
    );

    const enriched = (pinned || []).map(m => ({
      ...m,
      sender_name: nameMap.get(m.sender_id) || 'Unknown',
    }));

    return NextResponse.json({ pinned: enriched });
  } catch (error) {
    console.error('Error in pin GET:', error);
    return NextResponse.json({ error: 'Failed to load pinned messages' }, { status: 500 });
  }
}

// POST - Pin or unpin a message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message_id, pin } = body;

    if (!message_id) {
      return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
    }

    // Get current message
    const { data: message } = await adminClient
      .from('project_messages')
      .select('is_pinned, project_id, company_id')
      .eq('id', message_id)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is company member (only company can pin)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.company_id !== message.company_id || 
        !['admin', 'owner', 'manager'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Only admins/managers can pin messages' }, { status: 403 });
    }

    const shouldPin = pin !== undefined ? pin : !message.is_pinned;

    const { data: updated, error: updateError } = await adminClient
      .from('project_messages')
      .update({
        is_pinned: shouldPin,
        pinned_at: shouldPin ? new Date().toISOString() : null,
        pinned_by: shouldPin ? user.id : null,
      })
      .eq('id', message_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error pinning message:', updateError);
      return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: updated,
      action: shouldPin ? 'pinned' : 'unpinned'
    });
  } catch (error) {
    console.error('Error in pin POST:', error);
    return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
  }
}
