/**
 * QuickBooks OAuth - Disconnect Endpoint
 * Revokes QB access and removes connection from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeToken } from '@/lib/quickbooks';

export async function POST(request: NextRequest) {
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
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Check permissions
    if (!['admin', 'owner'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get QB connection
    const { data: connection, error: connError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('company_id', member.company_id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'No active QuickBooks connection found' },
        { status: 404 }
      );
    }

    // Revoke token with QuickBooks
    try {
      await revokeToken(connection.refresh_token);
    } catch (revokeError) {
      console.error('Failed to revoke token with QB:', revokeError);
      // Continue anyway to deactivate local connection
    }

    // Deactivate connection in database
    const { error: updateError } = await supabase
      .from('quickbooks_connections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', connection.id);

    if (updateError) {
      console.error('Failed to deactivate connection:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect QuickBooks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'QuickBooks disconnected successfully',
    });

  } catch (error) {
    console.error('QuickBooks disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect QuickBooks' },
      { status: 500 }
    );
  }
}
