import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncSubscriptionQuantity } from '@/lib/billing-utils';
import { BILLABLE_ROLES } from '@/lib/plans';

// POST - Create user account for invitation (skips email verification)
export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, token, companyId, role, invitationId } = await req.json();

    if (!email || !password || !fullName || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Verify the invitation token is valid
    const { data: invitation, error: inviteError } = await adminSupabase
      .from('user_invitations')
      .select('id, email, company_id, role, status, expires_at, companies(name)')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation token' 
      }, { status: 400 });
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Verify the email matches
    if (invitation.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Email does not match the invitation' 
      }, { status: 400 });
    }

    // Create user with admin client - this SKIPS email confirmation
    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email - NO verification needed!
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) {
      console.error('Create user error:', createError);
      
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists')) {
        return NextResponse.json({ 
          error: 'This email is already registered. Please log in instead.',
          code: 'USER_EXISTS'
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (!userData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const userId = userData.user.id;

    // Create profile for the new user
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        company_id: invitation.company_id,
        role: invitation.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Try to clean up the auth user
      await adminSupabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // Mark invitation as accepted
    await adminSupabase
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // Sync billing if this is a billable role
    if (BILLABLE_ROLES.includes(invitation.role)) {
      try {
        await syncSubscriptionQuantity(invitation.company_id);
      } catch (billingError) {
        console.error('[Accept Invitation] Failed to sync billing:', billingError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully',
      userId: userId
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
