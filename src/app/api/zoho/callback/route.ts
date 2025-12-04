/**
 * Zoho OAuth - Callback Endpoint
 * Handles the OAuth callback from Zoho
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeZohoCode, getZohoOrganizations } from '@/lib/zoho';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Zoho
    if (error) {
      console.error('[Zoho] OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_invalid`);
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_invalid_state`);
    }

    const { companyId, userId } = stateData;

    // Exchange code for tokens
    const tokens = await exchangeZohoCode(code);
    if (!tokens) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_token_failed`);
    }

    // Get connected organizations
    const orgs = await getZohoOrganizations(tokens.access_token);
    const org = orgs?.find(o => o.is_default_org) || orgs?.[0];

    if (!org) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_no_org`);
    }

    // Save tokens to database
    const supabase = await createClient();

    // Check if integration record exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('company_id', companyId)
      .eq('provider', 'zoho')
      .single();

    const integrationData = {
      company_id: companyId,
      provider: 'zoho',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      tenant_id: org.organization_id,
      tenant_name: org.name,
      connected_by: userId,
      connected_at: new Date().toISOString(),
      status: 'connected',
      settings: { api_domain: tokens.api_domain },
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

    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&success=zoho_connected`);

  } catch (error) {
    console.error('[Zoho] Callback error:', error);
    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&error=zoho_failed`);
  }
}
