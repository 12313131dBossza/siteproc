import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/server-utils';
import { syncSubscriptionQuantity } from '@/lib/billing-utils';

/**
 * POST /api/billing/sync-users
 * Syncs the subscription quantity with current billable user count
 * Call this after adding/removing users
 */
export async function POST() {
  try {
    const { profile, error: profileError } = await getCurrentUserProfile();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can trigger billing sync
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const result = await syncSubscriptionQuantity(profile.company_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Billing] Sync users error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
