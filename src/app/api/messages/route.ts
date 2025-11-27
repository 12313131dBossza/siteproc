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
    const participantId = searchParams.get('participant_id');

    if (!projectId || !channel) {
      return NextResponse.json({ error: 'Missing project_id or channel' }, { status: 400 });
    }

    // Get user's profile and role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';
    const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
    const isClient = userRole === 'viewer' || userRole === 'client';
    const isSupplier = userRole === 'supplier';

    console.log('Messages GET - User:', user.id, 'Role:', userRole, 'Project:', projectId, 'Channel:', channel);

    // Get project info
    const { data: project } = await adminClient
      .from('projects')
      .select('company_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;
    
    if (isCompanyMember && profile?.company_id === project.company_id) {
      // Company member with matching company
      hasAccess = true;
    } else if (isSupplier && channel === 'company_supplier') {
      // Check if supplier is assigned to this project via project_members
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .eq('external_type', 'supplier')
        .maybeSingle();
      
      if (membership) {
        hasAccess = true;
      }
    } else if (isClient && channel === 'company_client') {
      // Check if client is member of this project
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (membership) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      console.log('Access denied for user:', user.id, 'Role:', userRole);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('Access granted, fetching messages...');

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

    // For company members viewing specific participant, filter messages
    // For now, show all messages in the channel (can filter by recipient_id once added)
    // if (isCompanyMember && participantId) {
    //   query = query.or(`sender_id.eq.${participantId},recipient_id.eq.${participantId}`);
    // }

    const { data: messages, error: messagesError } = await query;

    console.log('Messages query result - count:', messages?.length || 0, 'error:', messagesError);

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

    // Fetch reactions for all messages
    const messageIds = (messages || []).map(m => m.id);
    let reactionsMap = new Map();
    
    if (messageIds.length > 0) {
      const { data: reactions } = await adminClient
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      // Group reactions by message
      (reactions || []).forEach(r => {
        if (!reactionsMap.has(r.message_id)) {
          reactionsMap.set(r.message_id, {});
        }
        const msgReactions = reactionsMap.get(r.message_id);
        if (!msgReactions[r.emoji]) {
          msgReactions[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasReacted: false };
        }
        msgReactions[r.emoji].count++;
        msgReactions[r.emoji].users.push(r.user_id);
        if (r.user_id === user.id) {
          msgReactions[r.emoji].hasReacted = true;
        }
      });
    }

    // Add reactions to messages
    const messagesWithReactions = enrichedMessages.map(m => ({
      ...m,
      reactions: reactionsMap.has(m.id) ? Object.values(reactionsMap.get(m.id)) : [],
    }));

    return NextResponse.json({ messages: messagesWithReactions });
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
    const { project_id, channel, delivery_id, message, recipient_id, parent_message_id, attachment_url, attachment_name, attachment_type } = body;

    if (!project_id || !channel || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's profile and role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, full_name, username, role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';
    const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
    const isClient = userRole === 'viewer' || userRole === 'client';
    const isSupplier = userRole === 'supplier';

    console.log('Message POST - User:', user.id, 'Role:', userRole, 'Project:', project_id, 'Channel:', channel);

    // Get project info
    const { data: project } = await adminClient
      .from('projects')
      .select('company_id')
      .eq('id', project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Determine sender_type and validate access
    let senderType = '';
    let hasAccess = false;

    if (isCompanyMember && profile?.company_id === project.company_id) {
      senderType = 'company';
      hasAccess = true;
    } else if (isSupplier && channel === 'company_supplier') {
      // Verify supplier is member of this project
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', project_id)
        .eq('status', 'active')
        .eq('external_type', 'supplier')
        .maybeSingle();
      
      console.log('Supplier membership check:', membership);
      
      if (membership) {
        senderType = 'supplier';
        hasAccess = true;
      }
    } else if (isClient && channel === 'company_client') {
      // Verify client is member of project
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', project_id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (membership) {
        senderType = 'client';
        hasAccess = true;
      }
    }

    console.log('Access check result:', hasAccess, 'Sender type:', senderType);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the message
    const messageData: any = {
      project_id,
      company_id: project.company_id,
      channel,
      delivery_id: delivery_id || null,
      sender_id: user.id,
      sender_type: senderType,
      message: message.trim(),
      is_read: false,
      parent_message_id: parent_message_id || null,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_type: attachment_type || null,
    };

    // TODO: Add recipient_id support once ADD-RECIPIENT-TO-MESSAGES.sql is run
    // if (recipient_id) {
    //   messageData.recipient_id = recipient_id;
    // }

    const { data: newMessage, error: insertError } = await adminClient
      .from('project_messages')
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({
      message: {
        ...newMessage,
        sender_name: profile?.full_name || profile?.username || 'You',
      }
    });
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
