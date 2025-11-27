import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

interface Participant {
  id: string;
  name: string;
  type: 'supplier' | 'client';
  project_id: string;
  project_name: string;
  project_code?: string;
}

// GET all conversations for the user (company member, client, or supplier)
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
    const isSupplier = userRole === 'supplier';

    console.log('Conversations API - User:', user.id, 'Role:', userRole, 'Is Supplier:', isSupplier);

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
    } else if (isSupplier || isClient) {
      // Suppliers and clients see projects they're members of via project_members
      console.log('Fetching projects for supplier/client via project_members...');
      
      const { data: memberProjects, error: memberError } = await adminClient
        .from('project_members')
        .select('project_id, external_type, projects(id, name, code)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      console.log('Member projects query result:', memberProjects, 'Error:', memberError);

      if (memberProjects && memberProjects.length > 0) {
        for (const mp of memberProjects) {
          const proj = mp.projects as any;
          if (proj && !projectIds.includes(proj.id)) {
            projectIds.push(proj.id);
            projectMap.set(proj.id, { name: proj.name, code: proj.code });
          }
        }
      }
      
      console.log('Found project IDs for supplier/client:', projectIds);
    }

    // Build projects list for UI - ALWAYS return all projects
    const projects = projectIds.map(id => ({
      id,
      name: projectMap.get(id)?.name || 'Unknown',
      code: projectMap.get(id)?.code,
      status: 'active'
    }));

    // For company members, get all participants (suppliers and clients) for each project
    let participants: Participant[] = [];
    
    if (isCompanyMember && projectIds.length > 0) {
      // Get all external members (suppliers and clients) for company's projects
      // Include both accepted (user_id) and pending (external_email/external_name) members
      const { data: externalMembers, error: membersError } = await adminClient
        .from('project_members')
        .select('id, user_id, project_id, external_type, external_email, external_name, profiles(id, full_name, username)')
        .in('project_id', projectIds)
        .in('external_type', ['supplier', 'client'])
        .eq('status', 'active');

      console.log('External members query result:', externalMembers, 'Error:', membersError);

      if (externalMembers && externalMembers.length > 0) {
        for (const em of externalMembers) {
          const profile = em.profiles as any;
          const projInfo = projectMap.get(em.project_id);
          
          if (projInfo) {
            // Get name from profile (if accepted) or from external_name/email (if pending)
            let participantName = 'Unknown';
            let participantId = em.user_id || em.id; // Use member id if no user_id
            
            if (profile && profile.full_name) {
              participantName = profile.full_name;
            } else if (profile && profile.username) {
              participantName = profile.username;
            } else if (em.external_name) {
              participantName = em.external_name;
            } else if (em.external_email) {
              participantName = em.external_email.split('@')[0];
            }
            
            participants.push({
              id: participantId,
              name: participantName,
              type: em.external_type as 'supplier' | 'client',
              project_id: em.project_id,
              project_name: projInfo.name,
              project_code: projInfo.code
            });
          }
        }
      }
    }

    console.log('Final participants list:', participants);

    if (projectIds.length === 0) {
      return NextResponse.json({ 
        conversations: [], 
        projects: [],
        participants: [],
        currentUserId: user.id,
        userRole 
      });
    }

    // Determine which channel to filter by based on role
    let channelFilter: string | null = null;
    if (isClient) {
      channelFilter = 'company_client'; // Clients only see company_client channel
    } else if (isSupplier) {
      channelFilter = 'company_supplier'; // Suppliers only see company_supplier channel
    }
    // Company members see all channels (null filter)

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

    // Even if no messages, still return projects and participants
    if (!messages || messages.length === 0) {
      return NextResponse.json({ 
        conversations: [], 
        projects,
        participants,  // Return participants so company can start conversations
        currentUserId: user.id,
        userRole 
      });
    }

    // Group messages into conversations
    // For company: group by project + participant (each supplier/client is a separate conversation)
    // For supplier/client: group by project (they talk to "Project Team")
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
      .select('id, full_name, username, role')
      .in('id', senderIds);

    const nameMap = new Map(
      (profilesData || []).map(p => [p.id, { name: p.full_name || p.username || 'Unknown', role: p.role }])
    );

    // Process messages into conversations
    for (const msg of messages) {
      let convKey: string;
      let participantId = '';
      let participantType = '';
      let participantName = 'Unknown';

      if (isCompanyMember) {
        // For company: create conversation per participant (sender who is not company)
        // Find the non-company participant in this conversation
        if (msg.sender_type === 'company') {
          // Message from company - need to find who it's to
          // Look at other messages in this project/channel to find the external user
          const otherParticipant = participants.find(p => 
            p.project_id === msg.project_id && 
            ((msg.channel === 'company_supplier' && p.type === 'supplier') ||
             (msg.channel === 'company_client' && p.type === 'client'))
          );
          if (otherParticipant) {
            participantId = otherParticipant.id;
            participantType = otherParticipant.type;
            participantName = otherParticipant.name;
          }
        } else {
          // Message from external user
          participantId = msg.sender_id;
          participantType = msg.sender_type || 'unknown';
          const senderInfo = nameMap.get(msg.sender_id);
          participantName = senderInfo?.name || msg.sender_type || 'Unknown';
        }
        
        // Create key based on project + participant
        convKey = `${msg.project_id}-${participantId || msg.channel}`;
      } else {
        // For supplier/client: they talk to the company team as a whole
        participantType = 'company';
        participantName = 'Project Team';
        convKey = `${msg.project_id}-company`;
      }

      if (!conversationMap.has(convKey)) {
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
      projects,
      participants,  // Return participants for company to start new conversations
      currentUserId: user.id,
      userRole
    });
  } catch (error) {
    console.error('Error in conversations GET:', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}
