import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'
import { syncAllExpenses, syncAllOrders, syncExpenseToBill, syncOrderToPurchaseOrder } from '@/lib/quickbooks-sync'
import { getConnectionStatus } from '@/lib/quickbooks'

// POST /api/quickbooks/sync - Trigger manual sync
export async function POST(request: NextRequest) {
  try {
    const { profile, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/owner
    if (!['admin', 'owner', 'bookkeeper'].includes(profile.role || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only admins, owners, or bookkeepers can sync.' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { syncType, entityId } = body // syncType: 'expenses' | 'orders' | 'both' | 'single-expense' | 'single-order'

    // Check QB connection
    const connectionStatus = await getConnectionStatus(profile.company_id)
    if (!connectionStatus.connected) {
      return NextResponse.json({
        error: 'QuickBooks not connected. Please connect QuickBooks first.'
      }, { status: 400 })
    }

    let result: any = {}

    if (syncType === 'single-expense' && entityId) {
      // Sync single expense
      const syncResult = await syncExpenseToBill(
        profile.company_id,
        connectionStatus.realmId!,
        entityId
      )
      result = {
        type: 'single-expense',
        success: syncResult.success,
        qbId: syncResult.qbBillId,
        error: syncResult.error
      }
    } else if (syncType === 'single-order' && entityId) {
      // Sync single order
      const syncResult = await syncOrderToPurchaseOrder(
        profile.company_id,
        connectionStatus.realmId!,
        entityId
      )
      result = {
        type: 'single-order',
        success: syncResult.success,
        qbId: syncResult.qbPOId,
        error: syncResult.error
      }
    } else if (syncType === 'expenses') {
      // Sync all expenses
      const syncResult = await syncAllExpenses(profile.company_id)
      result = {
        type: 'expenses',
        ...syncResult
      }
    } else if (syncType === 'orders') {
      // Sync all orders
      const syncResult = await syncAllOrders(profile.company_id)
      result = {
        type: 'orders',
        ...syncResult
      }
    } else if (syncType === 'both') {
      // Sync both expenses and orders
      const expensesResult = await syncAllExpenses(profile.company_id)
      const ordersResult = await syncAllOrders(profile.company_id)
      result = {
        type: 'both',
        expenses: expensesResult,
        orders: ordersResult,
        success: expensesResult.success && ordersResult.success
      }
    } else {
      return NextResponse.json({
        error: 'Invalid sync type. Must be: expenses, orders, both, single-expense, or single-order'
      }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Sync completed',
      result
    })

  } catch (error) {
    console.error('Error in QuickBooks sync:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/quickbooks/sync - Get sync status
export async function GET(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get connection status
    const connectionStatus = await getConnectionStatus(profile.company_id)

    if (!connectionStatus.connected) {
      return NextResponse.json({
        connected: false,
        message: 'QuickBooks not connected'
      })
    }

    // Get sync statistics
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('id, last_sync_at')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .single()

    // Count pending items
    const { data: pendingExpenses } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'approved')
      .is('quickbooks_bill_id', null)

    const { data: pendingOrders } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'approved')
      .is('quickbooks_po_id', null)

    // Get recent sync logs
    const { data: recentSyncs } = await supabase
      .from('quickbooks_sync_log')
      .select('*')
      .eq('connection_id', connection?.id)
      .order('completed_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      connected: true,
      realmId: connectionStatus.realmId,
      lastSync: connectionStatus.lastSync,
      pending: {
        expenses: pendingExpenses?.length || 0,
        orders: pendingOrders?.length || 0
      },
      recentSyncs: recentSyncs || []
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
