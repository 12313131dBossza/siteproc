/**
 * QuickBooks Connection Status Endpoint
 * Returns current QB connection status for the user's company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnectionStatus } from '@/lib/quickbooks';
import { createClient } from '@/lib/supabase/server';

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

    // Get user's company
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Get connection status
    const status = await getConnectionStatus(member.company_id);

    return NextResponse.json(status);

  } catch (error) {
    console.error('QuickBooks status error:', error);
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    );
  }
}
