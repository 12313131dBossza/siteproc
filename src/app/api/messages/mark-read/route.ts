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

    // Get user's profile and role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';
    const isCompanyMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(userRole);
    const isClient = userRole === 'viewer' || userRole === 'client';
    const isSupplier = userRole === 'supplier';

    // Verify access to project
    const { data: project } = await adminClient
      .from('projects')
      .select('company_id')
      .eq('id', project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let hasAccess = false;
    let markSenderType: string | null = null; // Which sender_type messages to mark as read

    if (isCompanyMember && profile?.company_id === project.company_id) {
      // Company member - mark messages from suppliers/clients as read
      hasAccess = true;
      // Mark messages NOT from company (i.e., from suppliers/clients)
      markSenderType = 'company'; // Will use neq to mark non-company messages
    } else if (isSupplier || isClient) {
      // Check if external user is a member of this project
      const { data: membership } = await adminClient
        .from('project_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', project_id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership) {
        hasAccess = true;
        // Mark messages from company as read (for suppliers/clients)
        markSenderType = isSupplier ? 'supplier' : 'client'; // Will use neq to mark company messages
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query to mark messages as read
    // Mark all messages NOT sent by the current user's type
    let query = adminClient
      .from('project_messages')
      .update({ is_read: true, read_at: new Date().toISOString(), read_by: user.id })
      .eq('project_id', project_id)
      .eq('channel', channel)
      .eq('is_read', false)
      .neq('sender_id', user.id); // Don't mark own messages as read

    if (delivery_id) {
      query = query.eq('delivery_id', delivery_id);
    }

    const { error: updateError, count } = await query;

    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    console.log('Marked messages as read:', count);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error in mark-read POST:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
