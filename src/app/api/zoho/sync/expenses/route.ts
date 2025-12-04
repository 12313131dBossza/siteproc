import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAllExpensesToZoho, autoSyncExpenseToZoho } from '@/lib/zoho-autosync'

/**
 * POST /api/zoho/sync/expenses
 * Manually sync expenses to Zoho Books
 * 
 * Body options:
 * - { syncAll: true } - Sync all unsynced approved expenses
 * - { expenseId: "uuid" } - Sync a specific expense
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Check if user has permission (admin, owner, or bookkeeper)
    const allowedRoles = ['admin', 'owner', 'bookkeeper']
    if (!allowedRoles.includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // Sync a specific expense
    if (body.expenseId) {
      const result = await autoSyncExpenseToZoho(profile.company_id, body.expenseId, 'approved')
      return NextResponse.json({
        success: result.success,
        synced: result.synced,
        zohoId: result.zohoId,
        message: result.synced ? 'Expense synced to Zoho' : result.error
      })
    }

    // Sync all unsynced expenses
    if (body.syncAll) {
      const result = await syncAllExpensesToZoho(profile.company_id)
      return NextResponse.json({
        success: result.success,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
        message: `Synced ${result.synced} expenses, ${result.failed} failed`
      })
    }

    return NextResponse.json({ error: 'Invalid request. Provide expenseId or syncAll: true' }, { status: 400 })

  } catch (error) {
    console.error('[Zoho Sync] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/zoho/sync/expenses
 * Get Zoho sync status for expenses
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    // Check Zoho connection
    const { data: integration } = await supabase
      .from('integrations')
      .select('status, tenant_name, connected_at, settings')
      .eq('company_id', profile.company_id)
      .eq('provider', 'zoho')
      .single()

    if (!integration || integration.status !== 'connected') {
      return NextResponse.json({
        connected: false,
        message: 'Zoho Books not connected'
      })
    }

    // Get sync stats - use service client for reliable access
    const { createServiceClient } = await import('@/lib/supabase-service')
    const serviceClient = createServiceClient()

    const { data: stats } = await serviceClient
      .from('expenses')
      .select('id, status, zoho_expense_id')
      .eq('company_id', profile.company_id)
      .eq('status', 'approved')

    const totalApproved = stats?.length || 0
    const synced = stats?.filter(e => e.zoho_expense_id).length || 0
    const unsynced = totalApproved - synced

    return NextResponse.json({
      connected: true,
      organization: integration.tenant_name,
      connectedAt: integration.connected_at,
      autoSyncEnabled: integration.settings?.auto_sync_expenses !== false,
      stats: {
        totalApproved,
        synced,
        unsynced
      }
    })

  } catch (error) {
    console.error('[Zoho Sync Status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
