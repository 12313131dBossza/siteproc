import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET who is typing in a conversation
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

    // Get typing indicators from last 10 seconds (exclude current user)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    const { data: typing, error } = await adminClient
      .from('typing_indicators')
      .select('user_id, user_name, updated_at')
      .eq('project_id', projectId)
      .eq('channel', channel)
      .neq('user_id', user.id)
      .gte('updated_at', tenSecondsAgo);

    if (error) {
      console.error('Error fetching typing indicators:', error);
      return NextResponse.json({ error: 'Failed to fetch typing' }, { status: 500 });
    }

    return NextResponse.json({ 
      typing: (typing || []).map(t => ({
        userId: t.user_id,
        userName: t.user_name,
      }))
    });
  } catch (error) {
    console.error('Error in typing GET:', error);
    return NextResponse.json({ error: 'Failed to load typing' }, { status: 500 });
  }
}

// POST - Set typing status
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, channel, is_typing } = body;

    if (!project_id || !channel) {
      return NextResponse.json({ error: 'Missing project_id or channel' }, { status: 400 });
    }

    // Get user name
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || profile?.username || 'Someone';

    if (is_typing) {
      // Upsert typing indicator
      const { error } = await adminClient
        .from('typing_indicators')
        .upsert({
          project_id,
          channel,
          user_id: user.id,
          user_name: userName,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id,channel,user_id',
        });

      if (error) {
        console.error('Error setting typing:', error);
        return NextResponse.json({ error: 'Failed to set typing' }, { status: 500 });
      }
    } else {
      // Remove typing indicator
      await adminClient
        .from('typing_indicators')
        .delete()
        .eq('project_id', project_id)
        .eq('channel', channel)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in typing POST:', error);
    return NextResponse.json({ error: 'Failed to update typing' }, { status: 500 });
  }
}
