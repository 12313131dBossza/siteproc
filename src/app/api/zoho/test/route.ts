/**
 * Zoho Test Endpoint
 * Tests the Zoho connection by fetching organizations
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getZohoOrganizations, refreshZohoToken } from '@/lib/zoho';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company' }, { status: 400 });
    }

    // Get Zoho integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('provider', 'zoho')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Zoho not connected' }, { status: 400 });
    }

    // Check if token needs refresh
    let accessToken = integration.access_token;
    const expiresAt = new Date(integration.token_expires_at);
    
    if (expiresAt < new Date()) {
      // Token expired, refresh it
      const refreshed = await refreshZohoToken(integration.refresh_token);
      if (!refreshed) {
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 400 });
      }
      
      // Update token in database
      accessToken = refreshed.access_token;
      await supabase
        .from('integrations')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('id', integration.id);
    }

    // Test: Fetch organizations
    const orgs = await getZohoOrganizations(accessToken);

    return NextResponse.json({
      success: true,
      message: 'Zoho connection is working!',
      organizations: orgs,
      connectedOrg: integration.tenant_name,
      connectedAt: integration.connected_at,
    });

  } catch (error) {
    console.error('[Zoho Test] Error:', error);
    return NextResponse.json({ error: 'Test failed', details: String(error) }, { status: 500 });
  }
}
