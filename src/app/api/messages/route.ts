import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendMessageNotification } from '@/lib/email';

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

    // Check if user is a member of this project (for external users)
    const { data: projectMembership } = await adminClient
      .from('project_members')
      .select('id, external_type')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .maybeSingle();

    const isSupplierForProject = projectMembership?.external_type === 'supplier';
    const isClientForProject = projectMembership?.external_type === 'client';

    // Verify access
    let hasAccess = false;
    
    if (isCompanyMember && profile?.company_id === project.company_id) {
      // Company member with matching company
      hasAccess = true;
    } else if (isSupplierForProject && channel === 'company_supplier') {
      hasAccess = true;
    } else if (isClientForProject && channel === 'company_client') {
      hasAccess = true;
    }

    if (!hasAccess) {
      console.log('Access denied for user:', user.id, 'Role:', userRole, 'Membership:', projectMembership);
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

    // Filter for 1:1 DM - only show messages between current user and the participant
    if (participantId) {
      // Show messages where:
      // - Current user sent to participant, OR
      // - Participant sent to current user
      query = query.or(`and(sender_id.eq.${user.id},recipient_id.eq.${participantId}),and(sender_id.eq.${participantId},recipient_id.eq.${user.id})`);
    } else if (!isCompanyMember) {
      // For suppliers/clients without a specific participant selected, show only their messages
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    }

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
    const { project_id, channel, delivery_id, message, recipient_id, parent_message_id, attachment_url, attachment_name, attachment_type, message_type, metadata } = body;

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

    // Check if user is a member of this project (for external users)
    const { data: projectMembership } = await adminClient
      .from('project_members')
      .select('id, external_type')
      .eq('user_id', user.id)
      .eq('project_id', project_id)
      .eq('status', 'active')
      .maybeSingle();

    const isSupplierForProject = projectMembership?.external_type === 'supplier';
    const isClientForProject = projectMembership?.external_type === 'client';

    console.log('Project membership:', projectMembership, 'isSupplier:', isSupplierForProject, 'isClient:', isClientForProject);

    // Determine sender_type and validate access
    let senderType = '';
    let hasAccess = false;

    if (isCompanyMember && profile?.company_id === project.company_id) {
      senderType = 'company';
      hasAccess = true;
    } else if (isSupplierForProject && channel === 'company_supplier') {
      senderType = 'supplier';
      hasAccess = true;
    } else if (isClientForProject && channel === 'company_client') {
      senderType = 'client';
      hasAccess = true;
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
      message_type: message_type || 'text',
      metadata: metadata || null,
    };

    // Add recipient_id for 1:1 DM
    if (recipient_id) {
      messageData.recipient_id = recipient_id;
    }

    const { data: newMessage, error: insertError } = await adminClient
      .from('project_messages')
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Send notifications (email + in-app) to recipients
    try {
      // Get project info
      const { data: projectInfo } = await adminClient
        .from('projects')
        .select('name, company_id')
        .eq('id', project_id)
        .single();

      const senderName = profile?.full_name || profile?.username || 'Someone';
      const chatUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc.vercel.app'}/messages`;
      const messagePreview = message.trim().length > 100 
        ? message.trim().substring(0, 100) + '...' 
        : message.trim();

      // For 1:1 DM, only notify the specific recipient
      if (recipient_id) {
        // Get recipient info
        const { data: recipientProfile } = await adminClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', recipient_id)
          .single();

        if (recipientProfile) {
          // Create in-app notification for recipient
          const { error: notifError } = await adminClient.from('notifications').insert({
            user_id: recipient_id,
            company_id: projectInfo?.company_id || project.company_id,
            type: 'new_message',
            title: `New message from ${senderName}`,
            message: messagePreview,
            link: `/messages`,
            metadata: {
              project_id,
              project_name: projectInfo?.name,
              sender_id: user.id,
              sender_name: senderName,
              channel,
            },
            read: false,
          });
          if (notifError) console.error('Notification insert error:', notifError);

          // Send email notification
          if (recipientProfile.email) {
            sendMessageNotification({
              to: recipientProfile.email,
              senderName,
              projectName: projectInfo?.name || 'Project',
              message: message.trim(),
              messageType: message_type,
              chatUrl,
            }).catch(err => console.error('Email notification error:', err));
          }
        }
      } else {
        // Get other members in this channel who should receive notifications
        const { data: members } = await adminClient
          .from('project_members')
          .select('user_id, profiles(email, full_name)')
          .eq('project_id', project_id)
          .eq('status', 'active')
          .neq('user_id', user.id);

        if (members && members.length > 0) {
          // Create notifications for each member
          for (const member of members) {
            if (member.user_id) {
              // Create in-app notification
              const { error: notifError } = await adminClient.from('notifications').insert({
                user_id: member.user_id,
                company_id: projectInfo?.company_id || project.company_id,
                type: 'new_message',
                title: `New message from ${senderName}`,
                message: messagePreview,
                link: `/messages`,
                metadata: {
                  project_id,
                  project_name: projectInfo?.name,
                  sender_id: user.id,
                  sender_name: senderName,
                  channel,
                },
                read: false,
              });
              if (notifError) console.error('Notification insert error:', notifError);
            }

            const memberProfile = member.profiles as any;
            if (memberProfile?.email) {
              sendMessageNotification({
                to: memberProfile.email,
                senderName,
                projectName: projectInfo?.name || 'Project',
                message: message.trim(),
                messageType: message_type,
                chatUrl,
              }).catch(err => console.error('Email notification error:', err));
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the request if notifications fail
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
