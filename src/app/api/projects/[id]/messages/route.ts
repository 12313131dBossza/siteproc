import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: List messages for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    // Verify user has access to this project
    const adminClient = createAdminClient();
    
    // Check if user is company member or project member
    const isCompanyMember = profile?.company_id && 
      ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile.role || '');
    
    if (!isCompanyMember) {
      // Check project membership for external users
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const parentId = searchParams.get('parent_id');

    // Fetch messages
    let query = adminClient
      .from('project_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, email, avatar_url)
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Filter by parent (for threads)
    if (parentId === 'null') {
      query = query.is('parent_message_id', null);
    } else if (parentId) {
      query = query.eq('parent_message_id', parentId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: messages, error, count } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get reply counts for top-level messages
    if (!parentId || parentId === 'null') {
      const messageIds = messages?.map(m => m.id) || [];
      if (messageIds.length > 0) {
        const { data: replyCounts } = await adminClient
          .from('project_messages')
          .select('parent_message_id')
          .in('parent_message_id', messageIds)
          .is('deleted_at', null);

        const countMap: Record<string, number> = {};
        replyCounts?.forEach(r => {
          countMap[r.parent_message_id] = (countMap[r.parent_message_id] || 0) + 1;
        });

        messages?.forEach((m: any) => {
          m.reply_count = countMap[m.id] || 0;
        });
      }
    }

    return NextResponse.json({
      messages: messages || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and project info
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    const adminClient = createAdminClient();

    // Get project to verify access and get company_id
    const { data: project } = await adminClient
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access
    const isCompanyMember = profile?.company_id === project.company_id && 
      ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile?.role || '');
    
    if (!isCompanyMember) {
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Parse request body
    const body = await request.json();
    const { message, parent_message_id, attachment_url, attachment_name, attachment_type } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Insert message
    const { data: newMessage, error: insertError } = await adminClient
      .from('project_messages')
      .insert({
        project_id: projectId,
        company_id: project.company_id,
        sender_id: user.id,
        message: message.trim(),
        parent_message_id: parent_message_id || null,
        attachment_url: attachment_url || null,
        attachment_name: attachment_name || null,
        attachment_type: attachment_type || null,
      })
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Mark messages as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Mark all unread messages as read (except user's own messages)
    const { error: updateError } = await adminClient
      .from('project_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user.id,
      })
      .eq('project_id', projectId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Messages PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
