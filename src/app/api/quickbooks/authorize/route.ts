/**
 * QuickBooks OAuth - Authorization Endpoint
 * Initiates the OAuth flow by redirecting user to QuickBooks authorization page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthorizationUrl } from '@/lib/quickbooks';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's company from members table
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Check if user has permission (admin or owner only)
    if (!['admin', 'owner'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or Owner role required.' },
        { status: 403 }
      );
    }

    // Generate random state for CSRF protection
    const state = randomBytes(32).toString('hex');

    // Store state in session (you can also use cookies)
    // For now, we'll encode company_id in the state
    const stateData = JSON.stringify({
      companyId: member.company_id,
      userId: user.id,
      timestamp: Date.now(),
      random: state,
    });

    const encodedState = Buffer.from(stateData).toString('base64');

    // Get authorization URL
    const authUrl = getAuthorizationUrl(encodedState);

    // Redirect to QuickBooks authorization page
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('QuickBooks authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks authorization' },
      { status: 500 }
    );
  }
}
