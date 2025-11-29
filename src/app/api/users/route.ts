import { sbServer, sbAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { sendInvitationEmail } from '@/lib/email';

// GET /api/users - List all users in company
export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile to check permissions
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Use admin client to bypass RLS when listing company users
    const adminClient = sbAdmin();
    let query = adminClient
      .from('profiles')
      .select('*')
      .eq('company_id', currentProfile.company_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,department.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get auth users to enrich with email if missing
    const userIds = (users || []).map(u => u.id);
    let authUsersMap: Record<string, { email: string }> = {};
    
    if (userIds.length > 0) {
      try {
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        if (authUsers?.users) {
          authUsersMap = authUsers.users.reduce((acc, au) => {
            acc[au.id] = { email: au.email || '' };
            return acc;
          }, {} as Record<string, { email: string }>);
        }
      } catch (e) {
        console.error('Error fetching auth users:', e);
      }
    }

    // Enrich users with status, last_login, and email from auth if missing
    const enrichedUsers = (users || []).map(u => ({
      ...u,
      email: u.email || authUsersMap[u.id]?.email || null,
      status: u.status || 'active',
      last_login: u.last_login || null,
    }));

    // Log activity
    await supabase.rpc('log_user_activity', {
      action_name: 'users.list',
      resource_name: 'users',
      details_json: { filters: { role, status, search } }
    });

    return NextResponse.json(enrichedUsers);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Invite new user (internal team members only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile to check permissions
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Role hierarchy for permissions (higher number = more permissions)
    const roleHierarchy: Record<string, number> = {
      'viewer': 1,
      'accountant': 2,
      'manager': 3,
      'admin': 4,
      'owner': 5
    };

    const currentRoleLevel = roleHierarchy[currentProfile.role] || 0;

    // Only admin and owner can invite users
    if (currentRoleLevel < roleHierarchy['admin']) {
      return NextResponse.json({ error: 'Only admins and owners can invite team members' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, full_name, department, phone } = body;

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Validate role is a valid internal team role
    const validRoles = ['viewer', 'accountant', 'manager', 'admin', 'owner'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const targetRoleLevel = roleHierarchy[role] || 0;

    // Users can only invite people with roles LOWER than their own
    // Exception: owners can invite other owners
    if (currentProfile.role !== 'owner' && targetRoleLevel >= currentRoleLevel) {
      return NextResponse.json({ 
        error: `You can only invite users with roles below ${currentProfile.role}` 
      }, { status: 403 });
    }

    // Check if user already exists in this company
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('company_id', currentProfile.company_id)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists in this company' }, { status: 400 });
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        email,
        role,
        company_id: currentProfile.company_id,
        invited_by: user.id,
        invitation_token: invitationToken,
        metadata: { full_name, department, phone }
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    try {
      // Get inviter's full name for personalized email
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Get company name
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', currentProfile.company_id)
        .single();

      const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A team member';
      const companyName = company?.name || 'your company';

      await sendInvitationEmail({
        to: email,
        inviterName,
        companyName,
        role,
        invitationToken,
      });

      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
    }

    // Log activity
    await supabase.rpc('log_user_activity', {
      action_name: 'users.invite',
      resource_name: 'users',
      details_json: { email, role }
    });

    return NextResponse.json({ 
      success: true, 
      invitation,
      message: 'Invitation created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
