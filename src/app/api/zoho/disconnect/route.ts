/**
 * Zoho Disconnect Endpoint
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // Check permission
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update integration status
    await supabase
      .from('integrations')
      .update({ status: 'disconnected', access_token: null, refresh_token: null })
      .eq('company_id', profile.company_id)
      .eq('provider', 'zoho');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Zoho] Disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
