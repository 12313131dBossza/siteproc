import { sbServer } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendProjectInvitationEmail } from '@/lib/email';

// GET /api/projects/[id]/members - List project members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await sbServer();
    const adminClient = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Get members using admin client to bypass RLS
    const { data: members, error } = await adminClient
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Enrich internal members with profile data using admin client
    const enrichedMembers = await Promise.all(
      (members || []).map(async (member) => {
        if (member.user_id) {
          // Fetch profile for internal users using admin client
          const { data: profile } = await adminClient
            .from('profiles')
            .select('full_name, username, avatar_url, email')
            .eq('id', member.user_id)
            .single();
          
          // If no email in profile, try to get from auth.users
          let email = profile?.email;
          if (!email) {
            const { data: authUser } = await adminClient.auth.admin.getUserById(member.user_id);
            email = authUser?.user?.email;
          }
          
          return { 
            ...member, 
            profiles: {
              full_name: profile?.full_name,
              username: profile?.username,
              avatar_url: profile?.avatar_url,
              email: email,
            }
          };
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await sbServer();
    const adminClient = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
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
        edit_project: false,
        view_orders: true,
        create_orders: false,
        view_expenses: false,
        view_payments: false,
        view_documents: true,
        upload_documents: false,
        view_timeline: true,
        view_photos: true,
        use_chat: true,
        view_deliveries: false,
        manage_deliveries: false,
        invite_others: false,
      };
      memberData.invitation_token = crypto.randomUUID();
      memberData.invitation_sent_at = new Date().toISOString();
    } else {
      // Internal team member - look up user by email using admin client
      // First get the current user's company
      const { data: currentUserProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile?.company_id) {
        return NextResponse.json({ 
          error: 'Your profile is not associated with a company.' 
        }, { status: 400 });
      }

      // Look up the user by email and verify they're in the same company
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id, company_id')
        .eq('email', email)
        .single();

      if (!profile) {
        return NextResponse.json({ 
          error: 'User not found. They must be part of your company to be added as a team member.' 
        }, { status: 404 });
      }

      if (profile.company_id !== currentUserProfile.company_id) {
        return NextResponse.json({ 
          error: 'This user is not part of your company. Use External tab to invite external collaborators.' 
        }, { status: 400 });
      }

      memberData.user_id = profile.id;
      memberData.status = 'active'; // Internal users are active immediately
    }

    // Insert the member using admin client to bypass RLS
    const { data: member, error: insertError } = await adminClient
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

    // Send invitation email for external users
    if (isExternal && memberData.invitation_token) {
      try {
        // Get project and inviter info
        const { data: project } = await supabase
          .from('projects')
          .select('name, company_id')
          .eq('id', projectId)
          .single();

        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('full_name, companies:company_id(name)')
          .eq('id', user.id)
          .single();

        const companyName = (inviterProfile?.companies as any)?.name || 'Unknown Company';
        const inviterName = inviterProfile?.full_name || 'A team member';

        await sendProjectInvitationEmail({
          to: external_email,
          inviterName,
          projectName: project?.name || 'Project',
          companyName,
          role,
          invitationToken: memberData.invitation_token,
          externalName: external_name,
          permissions: memberData.permissions,
        });

        console.log(`Project invitation email sent to ${external_email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the request if email fails - member was still added
      }
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
