import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET user's bookmarked messages
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

    let query = adminClient
      .from('message_bookmarks')
      .select(`
        id,
        note,
        created_at,
        message_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: bookmarks, error } = await query;

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    // Get the actual messages
    const messageIds = (bookmarks || []).map(b => b.message_id);
    
    if (messageIds.length === 0) {
      return NextResponse.json({ bookmarks: [] });
    }

    let messagesQuery = adminClient
      .from('project_messages')
      .select('*')
      .in('id', messageIds)
      .is('deleted_at', null);

    if (projectId) {
      messagesQuery = messagesQuery.eq('project_id', projectId);
    }

    const { data: messages } = await messagesQuery;

    // Get sender names and project names
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    const projectIds = [...new Set((messages || []).map(m => m.project_id))];

    const [profilesRes, projectsRes] = await Promise.all([
      adminClient.from('profiles').select('id, full_name, username').in('id', senderIds),
      adminClient.from('projects').select('id, name').in('id', projectIds),
    ]);

    const nameMap = new Map(
      (profilesRes.data || []).map(p => [p.id, p.full_name || p.username || 'Unknown'])
    );
    const projectMap = new Map(
      (projectsRes.data || []).map(p => [p.id, p.name])
    );

    const enriched = (bookmarks || []).map(b => {
      const msg = messages?.find(m => m.id === b.message_id);
      if (!msg) return null;
      return {
        bookmarkId: b.id,
        note: b.note,
        bookmarkedAt: b.created_at,
        ...msg,
        sender_name: nameMap.get(msg.sender_id) || 'Unknown',
        project_name: projectMap.get(msg.project_id) || 'Unknown Project',
      };
    }).filter(Boolean);

    return NextResponse.json({ bookmarks: enriched });
  } catch (error) {
    console.error('Error in bookmark GET:', error);
    return NextResponse.json({ error: 'Failed to load bookmarks' }, { status: 500 });
  }
}

// POST - Add or remove bookmark
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message_id, note } = body;

    if (!message_id) {
      return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
    }

    // Check if already bookmarked
    const { data: existing } = await adminClient
      .from('message_bookmarks')
      .select('id')
      .eq('message_id', message_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      await adminClient
        .from('message_bookmarks')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ action: 'removed' });
    }

    // Add bookmark
    const { data: bookmark, error: insertError } = await adminClient
      .from('message_bookmarks')
      .insert({
        message_id,
        user_id: user.id,
        note: note || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding bookmark:', insertError);
      return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
    }

    return NextResponse.json({ action: 'added', bookmark });
  } catch (error) {
    console.error('Error in bookmark POST:', error);
    return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
  }
}

// DELETE - Remove bookmark
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');

    if (!messageId) {
      return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
    }

    const { error } = await adminClient
      .from('message_bookmarks')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing bookmark:', error);
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in bookmark DELETE:', error);
    return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
  }
}
