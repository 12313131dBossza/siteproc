/**
 * Zoho OAuth - Authorization Endpoint
 * Redirects user to Zoho login page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getZohoAuthUrl, isZohoConfigured } from '@/lib/zoho';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check if Zoho is configured
    if (!isZohoConfigured()) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_not_configured`);
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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=no_company`);
    }

    // Check permission
    if (!['admin', 'owner'].includes(profile.role || '')) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=permission_denied`);
    }

    // Generate state with company info
    const stateData = JSON.stringify({
      companyId: profile.company_id,
      userId: user.id,
      timestamp: Date.now(),
      random: randomBytes(16).toString('hex'),
    });

    const state = Buffer.from(stateData).toString('base64');

    // Redirect to Zoho
    const authUrl = getZohoAuthUrl(state);
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('[Zoho] Authorization error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_auth_failed`);
  }
}
