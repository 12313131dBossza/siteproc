import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET - Search messages
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const projectId = searchParams.get('project_id');
    const channel = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    // Get user's profile for access check
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(profile?.role || '');

    // Build search query
    let searchQuery = adminClient
      .from('project_messages')
      .select('*')
      .ilike('message', `%${query}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by project if specified
    if (projectId) {
      searchQuery = searchQuery.eq('project_id', projectId);
    }

    // Filter by channel if specified
    if (channel) {
      searchQuery = searchQuery.eq('channel', channel);
    }

    // Filter by company access if company member
    if (isCompanyMember && profile?.company_id) {
      searchQuery = searchQuery.eq('company_id', profile.company_id);
    } else {
      // For suppliers/clients, only search their project's messages
      const { data: memberships } = await adminClient
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const projectIds = (memberships || []).map(m => m.project_id);
      if (projectIds.length === 0) {
        return NextResponse.json({ messages: [] });
      }
      searchQuery = searchQuery.in('project_id', projectIds);
    }

    const { data: messages, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Error searching messages:', searchError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Get sender names and project names
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    const projectIds = [...new Set((messages || []).map(m => m.project_id))];

    const [profilesRes, projectsRes] = await Promise.all([
      adminClient.from('profiles').select('id, full_name, username').in('id', senderIds),
      adminClient.from('projects').select('id, name, code').in('id', projectIds),
    ]);

    const nameMap = new Map(
      (profilesRes.data || []).map(p => [p.id, p.full_name || p.username || 'Unknown'])
    );
    const projectMap = new Map(
      (projectsRes.data || []).map(p => [p.id, { name: p.name, code: p.code }])
    );

    const enriched = (messages || []).map(m => ({
      ...m,
      sender_name: nameMap.get(m.sender_id) || 'Unknown',
      project_name: projectMap.get(m.project_id)?.name || 'Unknown',
      project_code: projectMap.get(m.project_id)?.code,
    }));

    return NextResponse.json({ 
      messages: enriched,
      total: enriched.length,
      query,
    });
  } catch (error) {
    console.error('Error in search GET:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
