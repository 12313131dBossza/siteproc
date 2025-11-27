import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET all conversations for the company
export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and company
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    // Get all projects for this company
    const { data: projects } = await adminClient
      .from('projects')
      .select('id, name')
      .eq('company_id', profile.company_id);

    if (!projects || projects.length === 0) {
      return NextResponse.json({ conversations: [], currentUserId: user.id });
    }

    const projectIds = projects.map(p => p.id);
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    // Get all messages grouped by conversations
    const { data: messages } = await adminClient
      .from('project_messages')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ conversations: [], currentUserId: user.id });
    }

    // Group messages into conversations
    const conversationMap = new Map<string, {
      id: string;
      project_id: string;
      project_name: string;
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
      .eq('role', 'client');

    // Build supplier and client maps
    const supplierMap = new Map<string, Set<string>>();
    (supplierAssignments || []).forEach(sa => {
      if (!supplierMap.has(sa.project_id)) {
        supplierMap.set(sa.project_id, new Set());
      }
      supplierMap.get(sa.project_id)!.add(sa.supplier_id);
    });

    const clientMap = new Map<string, Set<string>>();
    (clientMembers || []).forEach(cm => {
      if (!clientMap.has(cm.project_id)) {
        clientMap.set(cm.project_id, new Set());
      }
      clientMap.get(cm.project_id)!.add(cm.user_id);
    });

    // Process messages into conversations
    for (const msg of messages) {
      // Create conversation key
      const convKey = `${msg.project_id}-${msg.channel}-${msg.delivery_id || 'none'}`;

      if (!conversationMap.has(convKey)) {
        // Determine participant based on channel
        let participantId = '';
        let participantType = '';
        let participantName = 'Unknown';

        if (msg.channel === 'company_supplier') {
          // Find supplier for this project
          const suppliers = supplierMap.get(msg.project_id);
          if (suppliers && suppliers.size > 0) {
            participantId = [...suppliers][0];
            participantType = 'supplier';
            participantName = nameMap.get(participantId) || 'Supplier';
          }
        } else if (msg.channel === 'company_client') {
          // Find client for this project
          const clients = clientMap.get(msg.project_id);
          if (clients && clients.size > 0) {
            participantId = [...clients][0];
            participantType = 'client';
            participantName = nameMap.get(participantId) || 'Client';
          }
        }

        // If we couldn't determine participant from maps, use message sender
        if (!participantId && msg.sender_type !== 'company') {
          participantId = msg.sender_id;
          participantType = msg.sender_type;
          participantName = nameMap.get(msg.sender_id) || msg.sender_type;
        }

        conversationMap.set(convKey, {
          id: convKey,
          project_id: msg.project_id,
          project_name: projectMap.get(msg.project_id) || 'Unknown Project',
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

      // Count unread messages (not read and not sent by company)
      const conv = conversationMap.get(convKey)!;
      if (!msg.is_read && msg.sender_type !== 'company') {
        conv.unread_count++;
      }
    }

    const conversations = [...conversationMap.values()].sort(
      (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );

    return NextResponse.json({ 
      conversations,
      currentUserId: user.id
    });
  } catch (error) {
    console.error('Error in conversations GET:', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}
