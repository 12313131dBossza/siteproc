import { sbAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { syncSubscriptionQuantity } from '@/lib/billing-utils';
import { BILLABLE_ROLES } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName, companyId, role, invitationId, metadata } = body;

    if (!userId || !email || !fullName || !companyId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use admin client with service role (bypasses RLS)
    const supabase = sbAdmin();

    // Try direct insert first - use insert instead of upsert to avoid triggers
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        company_id: companyId,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        // Don't return anything, just do the insert
        count: 'exact'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Error details:', JSON.stringify(profileError, null, 2));
      console.error('Attempted to create profile with:', { userId, email, fullName, companyId, role });
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: profileError,
        message: profileError.message || 'Unknown database error',
        code: profileError.code || 'UNKNOWN'
      }, { status: 500 });
    }

    // Update invitation status
    if (invitationId) {
      await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitationId);
    }

    // Sync Stripe subscription quantity if this is a billable user
    // This will charge the company for the new user
    if (BILLABLE_ROLES.includes(role)) {
      try {
        const result = await syncSubscriptionQuantity(companyId);
        console.log('[Accept Invitation] Billing sync result:', result);
      } catch (billingError) {
        console.error('[Accept Invitation] Failed to sync billing:', billingError);
        // Don't fail the invitation acceptance - billing sync is non-critical
      }
    }

    return NextResponse.json({ success: true, message: 'Profile created successfully' });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
