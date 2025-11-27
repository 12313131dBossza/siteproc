import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint to check messages in database
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    // Get all messages for a project
    let query = adminClient
      .from('project_messages')
      .select('id, project_id, channel, sender_id, sender_type, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get sender names
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .in('id', senderIds);

    const nameMap = new Map(
      (profiles || []).map(p => [p.id, { name: p.full_name, email: p.email }])
    );

    const enrichedMessages = (messages || []).map(m => ({
      ...m,
      sender_info: nameMap.get(m.sender_id) || { name: 'Unknown', email: 'Unknown' },
    }));

    // Also get project members for context
    const { data: members } = await adminClient
      .from('project_members')
      .select('id, user_id, project_id, external_type, external_name, external_email, status')
      .in('external_type', ['supplier', 'client'])
      .eq('status', 'active');

    return NextResponse.json({ 
      messages: enrichedMessages,
      members: members || [],
      total: messages?.length || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
