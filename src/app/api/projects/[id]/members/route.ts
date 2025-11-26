import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/projects/[id]/members - List project members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Get members (without join - we'll enrich separately)
    const { data: members, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Enrich internal members with profile data
    const enrichedMembers = await Promise.all(
      (members || []).map(async (member) => {
        if (member.user_id) {
          // Fetch profile for internal users
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', member.user_id)
            .single();
          
          return { ...member, profiles: profile };
        }
        return { ...member, profiles: null };
      })
    );

    return NextResponse.json({ members: enrichedMembers });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/members - Add a member
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { 
      email, // For internal users - we look up their user_id
      external_email,
      external_name,
      external_company,
      external_type,
      role = 'viewer',
      permissions 
    } = body;

    // Check if this is an internal or external invitation
    const isExternal = !!external_email;

    let memberData: any = {
      project_id: projectId,
      role,
      invited_by: user.id,
      status: 'pending',
    };

    if (isExternal) {
      // External collaborator
      memberData.external_email = external_email;
      memberData.external_name = external_name;
      memberData.external_company = external_company;
      memberData.external_type = external_type || 'other';
      memberData.permissions = permissions || {
        view_project: true,
        view_orders: true,
        view_expenses: false,
        view_payments: false,
        view_documents: true,
        edit_project: false,
        create_orders: false,
        upload_documents: false,
        invite_others: false,
      };
      memberData.invitation_token = crypto.randomUUID();
      memberData.invitation_sent_at = new Date().toISOString();
    } else {
      // Internal team member - look up user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) {
        return NextResponse.json({ 
          error: 'User not found. They must be part of your company to be added as a team member.' 
        }, { status: 404 });
      }

      memberData.user_id = profile.id;
      memberData.status = 'active'; // Internal users are active immediately
    }

    // Insert the member
    const { data: member, error: insertError } = await supabase
      .from('project_members')
      .insert(memberData)
      .select()
      .single();

    if (insertError) {
      console.error('Error adding member:', insertError);
      // Table doesn't exist
      if (insertError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Project access control is not set up. Please run the PROJECT-ACCESS-CONTROL-SCHEMA.sql in Supabase.' 
        }, { status: 500 });
      }
      // Duplicate entry
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This user is already a member of this project' }, { status: 400 });
      }
      // RLS policy violation
      if (insertError.code === '42501') {
        return NextResponse.json({ error: 'You do not have permission to add members to this project' }, { status: 403 });
      }
      return NextResponse.json({ error: `Failed to add member: ${insertError.message}` }, { status: 500 });
    }

    // TODO: Send invitation email for external users

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
