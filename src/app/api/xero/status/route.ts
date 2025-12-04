/**
 * Xero Status Endpoint
 * Check if Xero is connected for the current company
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isXeroConfigured } from '@/lib/xero';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false, configured: isXeroConfigured() });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ connected: false, configured: isXeroConfigured() });
    }

    // Check for Xero integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('tenant_name, connected_at, status')
      .eq('company_id', profile.company_id)
      .eq('provider', 'xero')
      .eq('status', 'connected')
      .single();

    return NextResponse.json({
      configured: isXeroConfigured(),
      connected: !!integration,
      tenantName: integration?.tenant_name || null,
      connectedAt: integration?.connected_at || null,
    });

  } catch (error) {
    console.error('[Xero] Status check error:', error);
    return NextResponse.json({ connected: false, configured: isXeroConfigured() });
  }
}
