import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST - Mark messages as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, channel, delivery_id } = body;

    if (!project_id || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      .eq('id', project_id)
      .single();

    if (!profile?.company_id || !project || project.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query to mark messages as read
    let query = adminClient
      .from('project_messages')
      .update({ is_read: true })
      .eq('project_id', project_id)
      .eq('channel', channel)
      .neq('sender_type', 'company'); // Only mark messages from others as read

    if (delivery_id) {
      query = query.eq('delivery_id', delivery_id);
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark-read POST:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
