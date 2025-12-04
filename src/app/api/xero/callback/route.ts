/**
 * Xero OAuth - Callback Endpoint
 * Handles the OAuth callback from Xero
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeXeroCode, getXeroTenants } from '@/lib/xero';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';

    // Handle errors from Xero
    if (error) {
      console.error('[Xero] OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=xero_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=xero_invalid`);
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=xero_invalid_state`);
    }

    const { companyId, userId } = stateData;

    // Exchange code for tokens
    const tokens = await exchangeXeroCode(code);
    if (!tokens) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=xero_token_failed`);
    }

    // Get connected tenants
    const tenants = await getXeroTenants(tokens.access_token);
    const tenant = tenants?.[0]; // Use first connected organization

    if (!tenant) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=xero_no_org`);
    }

    // Save tokens to database
    const supabase = await createClient();

    // Check if integration record exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('company_id', companyId)
      .eq('provider', 'xero')
      .single();

    const integrationData = {
      company_id: companyId,
      provider: 'xero',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName,
      connected_by: userId,
      connected_at: new Date().toISOString(),
      status: 'connected',
    };

    if (existing) {
      await supabase
        .from('integrations')
        .update(integrationData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('integrations')
        .insert(integrationData);
    }

    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&success=xero_connected`);

  } catch (error) {
    console.error('[Xero] Callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=xero_failed`);
  }
}
