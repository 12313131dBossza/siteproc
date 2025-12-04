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
    // Debug: Log configuration status
    console.log('Zoho Config Check:', {
      hasClientId: !!process.env.ZOHO_CLIENT_ID,
      hasClientSecret: !!process.env.ZOHO_CLIENT_SECRET,
      hasRedirectUri: !!process.env.ZOHO_REDIRECT_URI,
    });

    // Check if Zoho is configured
    if (!isZohoConfigured()) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
      // Return JSON error for debugging
      return NextResponse.json({ 
        error: 'Zoho not configured',
        missing: {
          ZOHO_CLIENT_ID: !process.env.ZOHO_CLIENT_ID,
          ZOHO_CLIENT_SECRET: !process.env.ZOHO_CLIENT_SECRET,
          ZOHO_REDIRECT_URI: !process.env.ZOHO_REDIRECT_URI,
        }
      }, { status: 400 });
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
