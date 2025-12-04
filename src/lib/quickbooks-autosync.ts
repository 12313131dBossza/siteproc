/**
 * QuickBooks Auto-Sync Utilities
 * Automatically sync expenses and orders to QuickBooks when created/updated
 */

import { getConnectionStatus } from './quickbooks';
import { syncExpenseToBill, syncOrderToPurchaseOrder } from './quickbooks-sync';
import { createServiceClient } from './supabase-service';

interface AutoSyncResult {
  success: boolean;
  synced: boolean;
  qbId?: string;
  error?: string;
}

/**
 * Check if auto-sync is enabled for a company
 */
export async function isAutoSyncEnabled(companyId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // Check if company has QuickBooks connected and auto-sync enabled
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('is_active, auto_sync')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    // Auto-sync is enabled if connected and auto_sync is true (or not explicitly false)
    return connection?.is_active && (connection.auto_sync !== false);
  } catch (error) {
    return false;
  }
}

/**
 * Auto-sync a single expense to QuickBooks (if enabled)
 * Call this after creating or approving an expense
 */
export async function autoSyncExpense(
  companyId: string,
  expenseId: string,
  status: string
): Promise<AutoSyncResult> {
  // Only sync approved expenses
  if (status !== 'approved') {
    return { success: true, synced: false, error: 'Only approved expenses are synced' };
  }

  try {
    // Check if auto-sync is enabled
    const autoSyncEnabled = await isAutoSyncEnabled(companyId);
    if (!autoSyncEnabled) {
      return { success: true, synced: false, error: 'Auto-sync not enabled' };
    }

    // Check connection status
    const connectionStatus = await getConnectionStatus(companyId);
    if (!connectionStatus.connected || !connectionStatus.realmId) {
      return { success: true, synced: false, error: 'QuickBooks not connected' };
    }

    // Sync the expense
    const result = await syncExpenseToBill(companyId, connectionStatus.realmId, expenseId);
    
    if (result.success) {
      console.log(`[AutoSync] Expense ${expenseId} synced to QuickBooks Bill ${result.qbBillId}`);
      return { success: true, synced: true, qbId: result.qbBillId };
    } else {
      console.warn(`[AutoSync] Failed to sync expense ${expenseId}: ${result.error}`);
      return { success: false, synced: false, error: result.error };
    }
  } catch (error) {
    console.error('[AutoSync] Error syncing expense:', error);
    return { success: false, synced: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Auto-sync a single order to QuickBooks (if enabled)
 * Call this after creating or approving an order
 */
export async function autoSyncOrder(
  companyId: string,
  orderId: string,
  status: string
): Promise<AutoSyncResult> {
  // Only sync approved orders
  if (!['approved', 'complete'].includes(status)) {
    return { success: true, synced: false, error: 'Only approved orders are synced' };
  }

  try {
    // Check if auto-sync is enabled
    const autoSyncEnabled = await isAutoSyncEnabled(companyId);
    if (!autoSyncEnabled) {
      return { success: true, synced: false, error: 'Auto-sync not enabled' };
    }

    // Check connection status
    const connectionStatus = await getConnectionStatus(companyId);
    if (!connectionStatus.connected || !connectionStatus.realmId) {
      return { success: true, synced: false, error: 'QuickBooks not connected' };
    }

    // Sync the order
    const result = await syncOrderToPurchaseOrder(companyId, connectionStatus.realmId, orderId);
    
    if (result.success) {
      console.log(`[AutoSync] Order ${orderId} synced to QuickBooks PO ${result.qbPOId}`);
      return { success: true, synced: true, qbId: result.qbPOId };
    } else {
      console.warn(`[AutoSync] Failed to sync order ${orderId}: ${result.error}`);
      return { success: false, synced: false, error: result.error };
    }
  } catch (error) {
    console.error('[AutoSync] Error syncing order:', error);
    return { success: false, synced: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Add auto_sync column to quickbooks_connections table
 * Run this SQL if needed:
 * 
 * ALTER TABLE quickbooks_connections 
 * ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT true;
 */
