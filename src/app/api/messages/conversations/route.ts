import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET all conversations for the user (company member or client)
export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    let projectIds: string[] = [];
    let projectMap = new Map<string, { name: string; code?: string }>();

    if (isCompanyMember && profile?.company_id) {
      // Company members see all their company's projects
      const { data: projects } = await adminClient
        .from('projects')
        .select('id, name, code')
        .eq('company_id', profile.company_id)
        .order('name');

      if (projects && projects.length > 0) {
        projectIds = projects.map(p => p.id);
        projectMap = new Map(projects.map(p => [p.id, { name: p.name, code: p.code }]));
      }
    } else if (isClient) {
      // Clients only see projects they're members of
      const { data: memberProjects } = await adminClient
        .from('project_members')
        .select('project_id, projects(id, name, code)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (memberProjects && memberProjects.length > 0) {
        for (const mp of memberProjects) {
          const proj = mp.projects as any;
          if (proj) {
            projectIds.push(proj.id);
            projectMap.set(proj.id, { name: proj.name, code: proj.code });
          }
        }
      }
    }

    // Build projects list for UI - ALWAYS return all projects
    const projects = projectIds.map(id => ({
      id,
      name: projectMap.get(id)?.name || 'Unknown',
      code: projectMap.get(id)?.code,
      status: 'active'
    }));

    if (projectIds.length === 0) {
      return NextResponse.json({ 
        conversations: [], 
        projects: [],
        currentUserId: user.id,
        userRole 
      });
    }

    // Determine which channel to filter by based on role
    let channelFilter = isCompanyMember ? null : 'company_client'; // Clients only see company_client channel

    // Get messages for conversations
    let messagesQuery = adminClient
      .from('project_messages')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (channelFilter) {
      messagesQuery = messagesQuery.eq('channel', channelFilter);
    }

    const { data: messages } = await messagesQuery;

    // Even if no messages, still return projects
    if (!messages || messages.length === 0) {
      return NextResponse.json({ 
        conversations: [], 
        projects,  // Return ALL projects so users can start conversations
        currentUserId: user.id,
        userRole 
      });
    }

    // Group messages into conversations
    const conversationMap = new Map<string, {
      id: string;
      project_id: string;
      project_name: string;
      project_code?: string;
      channel: string;
      participant_id: string;
      participant_name: string;
      participant_type: string;
      last_message: string;
      last_message_time: string;
      unread_count: number;
      delivery_id?: string;
    }>();

    // Get all unique sender IDs for name lookup
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    
    // Get names from profiles
    const { data: profilesData } = await adminClient
      .from('profiles')
      .select('id, full_name, username')
      .in('id', senderIds);

    const nameMap = new Map(
      (profilesData || []).map(p => [p.id, p.full_name || p.username || 'Unknown'])
    );

    // Get supplier assignments to identify participants
    const { data: supplierAssignments } = await adminClient
      .from('supplier_assignments')
      .select('supplier_id, project_id, delivery_id')
      .in('project_id', projectIds);

    // Get client members
    const { data: clientMembers } = await adminClient
      .from('project_members')
      .select('user_id, project_id')
      .in('project_id', projectIds)
      .in('role', ['client', 'viewer']);

    // Build supplier and client maps
    const supplierMapByProject = new Map<string, Set<string>>();
    (supplierAssignments || []).forEach(sa => {
      if (!supplierMapByProject.has(sa.project_id)) {
        supplierMapByProject.set(sa.project_id, new Set());
      }
      supplierMapByProject.get(sa.project_id)!.add(sa.supplier_id);
    });

    const clientMapByProject = new Map<string, Set<string>>();
    (clientMembers || []).forEach(cm => {
      if (!clientMapByProject.has(cm.project_id)) {
        clientMapByProject.set(cm.project_id, new Set());
      }
      clientMapByProject.get(cm.project_id)!.add(cm.user_id);
    });

    // Process messages into conversations
    for (const msg of messages) {
      // Create conversation key
      const convKey = `${msg.project_id}-${msg.channel}-${msg.delivery_id || 'none'}`;

      if (!conversationMap.has(convKey)) {
        // Determine participant based on channel and user role
        let participantId = '';
        let participantType = '';
        let participantName = 'Unknown';

        if (isCompanyMember) {
          // Company sees suppliers or clients as participants
          if (msg.channel === 'company_supplier') {
            const suppliers = supplierMapByProject.get(msg.project_id);
            if (suppliers && suppliers.size > 0) {
              participantId = [...suppliers][0];
              participantType = 'supplier';
              participantName = nameMap.get(participantId) || 'Supplier';
            }
          } else if (msg.channel === 'company_client') {
            const clients = clientMapByProject.get(msg.project_id);
            if (clients && clients.size > 0) {
              participantId = [...clients][0];
              participantType = 'client';
              participantName = nameMap.get(participantId) || 'Client';
            }
          }
        } else if (isClient) {
          // Client sees company as participant
          participantType = 'company';
          participantName = 'Project Team';
        }

        // Fallback: use message sender if participant not found
        if (!participantId && !isClient && msg.sender_type !== 'company') {
          participantId = msg.sender_id;
          participantType = msg.sender_type;
          participantName = nameMap.get(msg.sender_id) || msg.sender_type;
        }

        const projInfo = projectMap.get(msg.project_id);

        conversationMap.set(convKey, {
          id: convKey,
          project_id: msg.project_id,
          project_name: projInfo?.name || 'Unknown Project',
          project_code: projInfo?.code,
          channel: msg.channel,
          participant_id: participantId,
          participant_name: participantName,
          participant_type: participantType,
          last_message: msg.message,
          last_message_time: msg.created_at,
          unread_count: 0,
          delivery_id: msg.delivery_id,
        });
      }

      // Count unread messages (not read and not sent by current user)
      const conv = conversationMap.get(convKey)!;
      if (!msg.is_read && msg.sender_id !== user.id) {
        conv.unread_count++;
      }
    }

    const conversations = [...conversationMap.values()].sort(
      (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );

    return NextResponse.json({ 
      conversations,
      projects,  // Return ALL projects so users can start conversations
      currentUserId: user.id,
      userRole
    });
  } catch (error) {
    console.error('Error in conversations GET:', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}
