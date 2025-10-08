import { supabaseService } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users - List all users in company
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseService();
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

    // Build query
    let query = supabase
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

    // Log activity
    await supabase.rpc('log_user_activity', {
      action_name: 'users.list',
      resource_name: 'users',
      details_json: { filters: { role, status, search } }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Invite new user
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseService();
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

    // Check if user has permission to invite users
    if (!['owner', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, full_name, department, phone } = body;

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Only owners can create other owners
    if (role === 'owner' && currentProfile.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can create other owners' }, { status: 403 });
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

    // TODO: Send invitation email (integrate with email service)
    // For now, we'll just return the invitation details

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
