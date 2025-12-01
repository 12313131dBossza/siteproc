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

    // Also check project_members to see if user has supplier/client external_type
    // This handles cases where profile.role wasn't updated correctly
    const { data: membershipCheck } = await adminClient
      .from('project_members')
      .select('external_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    // Determine effective role - check profile first, then project_members
    let effectiveRole = profile?.role || 'viewer';
    if (membershipCheck?.external_type === 'supplier' && effectiveRole === 'viewer') {
      effectiveRole = 'supplier';
    } else if (membershipCheck?.external_type === 'client' && effectiveRole === 'viewer') {
      effectiveRole = 'client';
    } else if (membershipCheck?.external_type === 'contractor' && effectiveRole === 'viewer') {
      effectiveRole = 'contractor';
    } else if (membershipCheck?.external_type === 'consultant' && effectiveRole === 'viewer') {
      effectiveRole = 'consultant';
    }

    const userRole = effectiveRole;
    const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
    const isClient = userRole === 'viewer' || userRole === 'client';
    const isSupplier = userRole === 'supplier' || userRole === 'contractor' || userRole === 'consultant';

    console.log('Conversations API - User:', user.id, 'Profile Role:', profile?.role, 'Effective Role:', effectiveRole, 'Is Supplier:', isSupplier);

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
      // Don't join with profiles - fetch separately to avoid FK issues
      const { data: externalMembers, error: membersError } = await adminClient
        .from('project_members')
        .select('id, user_id, project_id, external_type, external_email, external_name')
        .in('project_id', projectIds)
        .in('external_type', ['supplier', 'client'])
        .eq('status', 'active');

      console.log('External members query - projectIds:', projectIds);
      console.log('External members query result:', JSON.stringify(externalMembers, null, 2));
      console.log('External members error:', membersError);

      if (externalMembers && externalMembers.length > 0) {
        // Get profile info for members who have user_id
        const userIds = externalMembers.filter(m => m.user_id).map(m => m.user_id);
        let profileMap = new Map<string, { full_name: string | null; username: string | null }>();
        
        if (userIds.length > 0) {
          const { data: profilesData } = await adminClient
            .from('profiles')
            .select('id, full_name, username')
            .in('id', userIds);
          
          if (profilesData) {
            profileMap = new Map(profilesData.map(p => [p.id, { full_name: p.full_name, username: p.username }]));
          }
        }

        for (const em of externalMembers) {
          const projInfo = projectMap.get(em.project_id);
          
          if (projInfo) {
            // Get name from profile (if accepted) or from external_name/email (if pending)
            let participantName = 'Unknown';
            let participantId = em.user_id || em.id; // Use member id if no user_id
            
            const profile = em.user_id ? profileMap.get(em.user_id) : null;
            
            if (profile && profile.full_name) {
              participantName = profile.full_name;
            } else if (profile && profile.username) {
              participantName = profile.username;
            } else if (em.external_name) {
              participantName = em.external_name;
            } else if (em.external_email) {
              participantName = em.external_email.split('@')[0];
            }
            
            console.log('Adding participant:', participantName, 'type:', em.external_type, 'project:', projInfo.name);
            
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

    console.log('Final participants count:', participants.length);

    // For suppliers/clients: Get company team members they can DM
    let companyTeamMembers: Participant[] = [];
    
    if ((isSupplier || isClient) && projectIds.length > 0) {
      // Get all projects' company IDs
      const { data: projectsData } = await adminClient
        .from('projects')
        .select('id, company_id')
        .in('id', projectIds);
      
      if (projectsData && projectsData.length > 0) {
        const companyIds = [...new Set(projectsData.map(p => p.company_id))];
        
        // Get company members for each project
        const { data: companyMembers } = await adminClient
          .from('profiles')
          .select('id, full_name, username, email, role')
          .in('company_id', companyIds)
          .in('role', ['admin', 'owner', 'manager', 'bookkeeper', 'member']);
        
        if (companyMembers && companyMembers.length > 0) {
          for (const cm of companyMembers) {
            // Add this company member as a DM target for each project they manage
            for (const proj of projectsData) {
              const projInfo = projectMap.get(proj.id);
              if (projInfo) {
                companyTeamMembers.push({
                  id: cm.id,
                  name: cm.full_name || cm.username || cm.email?.split('@')[0] || 'Team Member',
                  type: 'supplier', // Use 'supplier' type for channel matching (company_supplier)
                  project_id: proj.id,
                  project_name: projInfo.name,
                  project_code: projInfo.code
                });
              }
            }
          }
        }
      }
    }

    if (projectIds.length === 0) {
      return NextResponse.json({ 
        conversations: [], 
        projects: [],
        participants: [],
        companyTeamMembers: [],
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
        companyTeamMembers: companyTeamMembers || [],  // Return company team for suppliers/clients to DM
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
        // Use recipient_id if available for proper 1:1 DM
        if (msg.sender_type === 'company') {
          // Message from company - use recipient_id to find participant
          if (msg.recipient_id) {
            participantId = msg.recipient_id;
            const recipientInfo = nameMap.get(msg.recipient_id);
            participantName = recipientInfo?.name || 'Unknown';
            participantType = msg.channel === 'company_supplier' ? 'supplier' : 'client';
          } else {
            // Legacy: Look at other messages in this project/channel to find the external user
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
          }
        } else {
          // Message from external user - they are the participant
          participantId = msg.sender_id;
          participantType = msg.sender_type || 'unknown';
          const senderInfo = nameMap.get(msg.sender_id);
          participantName = senderInfo?.name || msg.sender_type || 'Unknown';
        }
        
        // Create key based on project + participant
        convKey = `${msg.project_id}-${participantId || msg.channel}`;
      } else {
        // For supplier/client: Group by who they're chatting with
        // Use recipient_id (for messages they sent) or sender_id (for messages from company)
        if (msg.sender_id === user.id) {
          // Message sent by this supplier/client - recipient is the company person
          participantId = msg.recipient_id || '';
          const recipientInfo = nameMap.get(msg.recipient_id || '');
          participantName = recipientInfo?.name || 'Project Team';
        } else {
          // Message received from company - sender is the company person
          participantId = msg.sender_id;
          const senderInfo = nameMap.get(msg.sender_id);
          participantName = senderInfo?.name || 'Project Team';
        }
        participantType = 'company';
        
        // Create conversation key - group by project + company team member
        convKey = participantId ? `${msg.project_id}-${participantId}` : `${msg.project_id}-company`;
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
      companyTeamMembers: companyTeamMembers || [],  // Return company team for suppliers/clients to DM
      currentUserId: user.id,
      userRole
    });
  } catch (error) {
    console.error('Error in conversations GET:', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}
