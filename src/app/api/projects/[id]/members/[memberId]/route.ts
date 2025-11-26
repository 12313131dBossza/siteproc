import { sbServer } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/projects/[id]/members/[memberId] - Update a member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;
    const body = await request.json();
    const { role, permissions, status } = body;

    // Use admin client to bypass RLS for updates
    const adminClient = createAdminClient();

    // Verify the user has permission to manage this project
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    // Check if user is admin/owner/manager or project owner
    const isCompanyAdmin = ['admin', 'owner', 'manager'].includes(userProfile?.role || '');
    
    if (!isCompanyAdmin) {
      // Check if user is project owner
      const { data: projectOwner } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();
      
      if (projectOwner?.role !== 'owner' && projectOwner?.role !== 'manager') {
        return NextResponse.json({ error: 'You do not have permission to manage this project' }, { status: 403 });
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (status !== undefined) updateData.status = status;

    const { data: member, error } = await adminClient
      .from('project_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return NextResponse.json({ error: 'Failed to update member: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/members/[memberId] - Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Verify the user has permission to manage this project
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const isCompanyAdmin = ['admin', 'owner', 'manager'].includes(userProfile?.role || '');
    
    if (!isCompanyAdmin) {
      const { data: projectOwner } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();
      
      if (projectOwner?.role !== 'owner' && projectOwner?.role !== 'manager') {
        return NextResponse.json({ error: 'You do not have permission to manage this project' }, { status: 403 });
      }
    }

    // Don't allow removing the owner
    const { data: member } = await adminClient
      .from('project_members')
      .select('role')
      .eq('id', memberId)
      .single();

    if (member?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove project owner' }, { status: 403 });
    }

    const { error } = await adminClient
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
