/**
 * Xero OAuth - Authorization Endpoint
 * Redirects user to Xero login page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getXeroAuthUrl, isXeroConfigured } from '@/lib/xero';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check if Xero is configured
    if (!isXeroConfigured()) {
      return NextResponse.json(
        { error: 'Xero integration is not configured' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Check permission
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json(
        { error: 'Only admins and owners can connect integrations' },
        { status: 403 }
      );
    }

    // Generate state with company info
    const stateData = JSON.stringify({
      companyId: profile.company_id,
      userId: user.id,
      timestamp: Date.now(),
      random: randomBytes(16).toString('hex'),
    });

    const state = Buffer.from(stateData).toString('base64');

    // Redirect to Xero
    const authUrl = getXeroAuthUrl(state);
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('[Xero] Authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to start Xero authorization' },
      { status: 500 }
    );
  }
}
