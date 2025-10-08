import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/[id] - Get single user details
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

    const userId = params.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user has access (same company)
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (currentProfile?.company_id !== (profile as any).company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user (role, status, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check permissions (only admins and owners can update users)
    if (!['owner', 'admin'].includes((currentProfile as any).role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const userId = params.id;
    const body = await request.json();
    const { role, status, full_name, department, phone } = body;

    // Get target user profile
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify same company
    if ((currentProfile as any).company_id !== (targetProfile as any).company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only owners can change roles or update other owners
    if (role && (currentProfile as any).role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change user roles' }, { status: 403 });
    }

    if ((targetProfile as any).role === 'owner' && (currentProfile as any).role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can update other owners' }, { status: 403 });
    }

    // Build update object
    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (full_name) updates.full_name = full_name;
    if (department !== undefined) updates.department = department;
    if (phone !== undefined) updates.phone = phone;

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.rpc('log_user_activity', {
        action_name: 'users.update',
        resource_name: 'users',
        resource_id_val: userId,
        details_json: updates
      });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Remove user from company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check permissions (only owners can delete users)
    if ((currentProfile as any).role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can remove users' }, { status: 403 });
    }

    const userId = params.id;

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Get target user
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify same company
    if ((currentProfile as any).company_id !== (targetProfile as any).company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete - set status to inactive
    const { error: deleteError } = await supabase
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', userId);

    if (deleteError) {
      console.error('Error removing user:', deleteError);
      return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.rpc('log_user_activity', {
        action_name: 'users.remove',
        resource_name: 'users',
        resource_id_val: userId,
        details_json: {}
      });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }

    return NextResponse.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
