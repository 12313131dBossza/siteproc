/**
 * Zoho Status Endpoint
 * Check if Zoho is connected for the current company
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isZohoConfigured } from '@/lib/zoho';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false, configured: isZohoConfigured() });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ connected: false, configured: isZohoConfigured() });
    }

    // Check for Zoho integration
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('tenant_name, connected_at, status')
      .eq('company_id', profile.company_id)
      .eq('provider', 'zoho')
      .single();

    console.log('[Zoho] Status check:', { 
      companyId: profile.company_id, 
      integration, 
      error: intError?.message 
    });

    // Consider connected if we have a record (even if status check differs)
    const isConnected = !!integration && integration.status === 'connected';

    return NextResponse.json({
      configured: isZohoConfigured(),
      connected: isConnected,
      organizationName: integration?.tenant_name || null,
      connectedAt: integration?.connected_at || null,
      debug: { hasRecord: !!integration, status: integration?.status, error: intError?.message }
    });

  } catch (error) {
    console.error('[Zoho] Status check error:', error);
    return NextResponse.json({ connected: false, configured: isZohoConfigured() });
  }
}
