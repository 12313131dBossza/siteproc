import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/projects/[id]/members/[memberId] - Update a member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = params;
    const body = await request.json();
    const { role, permissions, status } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (status) updateData.status = status;

    const { data: member, error } = await supabase
      .from('project_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
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
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = params;

    // Don't allow removing the owner
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('id', memberId)
      .single();

    if (member?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove project owner' }, { status: 403 });
    }

    const { error } = await supabase
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
