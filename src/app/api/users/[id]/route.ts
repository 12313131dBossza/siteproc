import { sbServer, sbAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get single user details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: userId } = await context.params;
    const supabase = await sbServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  context: RouteContext
) {
  try {
    const { id: userId } = await context.params;
    const supabase = await sbServer();
    const adminClient = sbAdmin();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile using admin client to bypass RLS
    const { data: currentProfile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!currentProfile) {
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

    const currentRoleLevel = roleHierarchy[(currentProfile as any).role] || 0;

    // Only admin and owner can update users
    if (currentRoleLevel < roleHierarchy['admin']) {
      return NextResponse.json({ error: 'Only admins and owners can update team members' }, { status: 403 });
    }

    const body = await request.json();
    const { role, status, full_name, department, phone } = body;

    // Get target user profile using admin client
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .single();

    console.log('Target user lookup:', { userId, targetProfile, targetError });

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify same company
    if ((currentProfile as any).company_id !== (targetProfile as any).company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const targetCurrentRoleLevel = roleHierarchy[(targetProfile as any).role] || 0;

    // Cannot modify users with same or higher role (except owners can modify anyone)
    if ((currentProfile as any).role !== 'owner' && targetCurrentRoleLevel >= currentRoleLevel) {
      return NextResponse.json({ 
        error: `You cannot modify users with ${(targetProfile as any).role} role` 
      }, { status: 403 });
    }

    // If changing role, validate the new role
    if (role) {
      const newRoleLevel = roleHierarchy[role] || 0;
      
      // Cannot assign roles equal to or higher than your own (except owners)
      if ((currentProfile as any).role !== 'owner' && newRoleLevel >= currentRoleLevel) {
        return NextResponse.json({ 
          error: `You can only assign roles below ${(currentProfile as any).role}` 
        }, { status: 403 });
      }
    }

    // Build update object - only include columns that exist in profiles table
    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (full_name) updates.full_name = full_name;
    // Note: department and phone are stored in user metadata, not profiles table

    // Update user using admin client to bypass RLS
    const { data: updatedUser, error: updateError } = await adminClient
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
  context: RouteContext
) {
  try {
    const { id: userId } = await context.params;
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
