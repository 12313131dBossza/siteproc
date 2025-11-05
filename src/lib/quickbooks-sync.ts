/**
 * QuickBooks Sync Service
 * Handles syncing of expenses (Bills) and orders (Purchase Orders) to QuickBooks
 */

import { createServiceClient } from './supabase-service'
import { makeQBApiCall, queryQB, logSync, getConnectionStatus } from './quickbooks'

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

interface VendorMapping {
  siteprocVendor: string
  quickbooksVendorId: string
  quickbooksVendorName: string
}

/**
 * Get or create vendor in QuickBooks
 */
async function getOrCreateVendor(
  companyId: string,
  realmId: string,
  vendorName: string,
  vendorMappings: VendorMapping[]
): Promise<string | null> {
  try {
    // Check if we have a mapping
    const mapping = vendorMappings.find(m => 
      m.siteprocVendor.toLowerCase() === vendorName.toLowerCase()
    )

    if (mapping) {
      return mapping.quickbooksVendorId
    }

    // Search for vendor in QuickBooks
    const searchQuery = `SELECT * FROM Vendor WHERE DisplayName = '${vendorName.replace(/'/g, "''")}'`
    const searchResult = await queryQB(companyId, realmId, searchQuery)

    if (searchResult.QueryResponse?.Vendor?.length > 0) {
      return searchResult.QueryResponse.Vendor[0].Id
    }

    // Create new vendor if not found
    const vendorPayload = {
      DisplayName: vendorName,
      PrintOnCheckName: vendorName
    }

    const createResult = await makeQBApiCall(companyId, realmId, '/vendor', {
      method: 'POST',
      body: JSON.stringify(vendorPayload)
    })

    return createResult.Vendor?.Id || null
  } catch (error) {
    console.error(`Error getting/creating vendor ${vendorName}:`, error)
    return null
  }
}

/**
 * Get or create account for expenses/bills
 */
async function getOrCreateExpenseAccount(
  companyId: string,
  realmId: string,
  accountName: string = 'Job Expenses'
): Promise<string | null> {
  try {
    // Search for expense account
    const searchQuery = `SELECT * FROM Account WHERE AccountType = 'Expense' AND Name = '${accountName.replace(/'/g, "''")}'`
    const searchResult = await queryQB(companyId, realmId, searchQuery)

    if (searchResult.QueryResponse?.Account?.length > 0) {
      return searchResult.QueryResponse.Account[0].Id
    }

    // Create expense account if not found
    const accountPayload = {
      Name: accountName,
      AccountType: 'Expense',
      AccountSubType: 'OtherMiscellaneousServiceCost'
    }

    const createResult = await makeQBApiCall(companyId, realmId, '/account', {
      method: 'POST',
      body: JSON.stringify(accountPayload)
    })

    return createResult.Account?.Id || null
  } catch (error) {
    console.error(`Error getting/creating account ${accountName}:`, error)
    return null
  }
}

/**
 * Sync a single expense to QuickBooks as a Bill
 */
export async function syncExpenseToBill(
  companyId: string,
  realmId: string,
  expenseId: string,
  vendorMappings: VendorMapping[] = []
): Promise<{ success: boolean; qbBillId?: string; error?: string }> {
  try {
    const supabase = createServiceClient()

    // Get expense details
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        projects(name),
        profiles(first_name, last_name)
      `)
      .eq('id', expenseId)
      .single()

    if (expenseError || !expense) {
      return { success: false, error: 'Expense not found' }
    }

    // Check if already synced
    if (expense.quickbooks_bill_id) {
      return { success: true, qbBillId: expense.quickbooks_bill_id }
    }

    // Get or create vendor
    const vendorId = await getOrCreateVendor(
      companyId,
      realmId,
      expense.vendor || 'Unknown Vendor',
      vendorMappings
    )

    if (!vendorId) {
      return { success: false, error: 'Failed to get/create vendor' }
    }

    // Get expense account
    const accountId = await getOrCreateExpenseAccount(companyId, realmId, expense.category || 'Job Expenses')

    if (!accountId) {
      return { success: false, error: 'Failed to get/create expense account' }
    }

    // Format date
    const spentDate = expense.spent_at 
      ? new Date(expense.spent_at).toISOString().split('T')[0]
      : new Date(expense.created_at).toISOString().split('T')[0]

    // Create Bill payload
    const billPayload = {
      VendorRef: { value: vendorId },
      TxnDate: spentDate,
      Line: [
        {
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: expense.amount,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: accountId }
          },
          Description: expense.description || expense.notes || `${expense.category} - ${expense.vendor}`
        }
      ],
      PrivateNote: `Synced from SiteProc | Expense ID: ${expenseId} | Project: ${expense.projects?.name || 'N/A'} | Submitted by: ${expense.profiles?.first_name} ${expense.profiles?.last_name}`
    }

    // Create Bill in QuickBooks
    const result = await makeQBApiCall(companyId, realmId, '/bill', {
      method: 'POST',
      body: JSON.stringify(billPayload)
    })

    const qbBillId = result.Bill?.Id

    if (!qbBillId) {
      return { success: false, error: 'Failed to create Bill in QuickBooks' }
    }

    // Update expense with QB Bill ID
    await supabase
      .from('expenses')
      .update({
        quickbooks_bill_id: qbBillId,
        quickbooks_synced_at: new Date().toISOString()
      })
      .eq('id', expenseId)

    return { success: true, qbBillId }
  } catch (error) {
    console.error('Error syncing expense to bill:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Sync a single order to QuickBooks as a Purchase Order
 */
export async function syncOrderToPurchaseOrder(
  companyId: string,
  realmId: string,
  orderId: string,
  vendorMappings: VendorMapping[] = []
): Promise<{ success: boolean; qbPOId?: string; error?: string }> {
  try {
    const supabase = createServiceClient()

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        projects(name),
        profiles(first_name, last_name)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Order not found' }
    }

    // Check if already synced
    if (order.quickbooks_po_id) {
      return { success: true, qbPOId: order.quickbooks_po_id }
    }

    // Get or create vendor
    const vendorId = await getOrCreateVendor(
      companyId,
      realmId,
      order.vendor || order.category || 'Unknown Vendor',
      vendorMappings
    )

    if (!vendorId) {
      return { success: false, error: 'Failed to get/create vendor' }
    }

    // Get expense account for PO
    const accountId = await getOrCreateExpenseAccount(companyId, realmId, order.category || 'Materials')

    if (!accountId) {
      return { success: false, error: 'Failed to get/create expense account' }
    }

    // Format date
    const orderDate = order.requested_at
      ? new Date(order.requested_at).toISOString().split('T')[0]
      : new Date(order.created_at).toISOString().split('T')[0]

    // Create Purchase Order payload
    const poPayload = {
      VendorRef: { value: vendorId },
      TxnDate: orderDate,
      Line: [
        {
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: order.amount,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: accountId }
          },
          Description: order.description || `${order.product_name || order.category} - ${order.quantity || ''} ${order.quantity ? 'units' : ''}`
        }
      ],
      PrivateNote: `Synced from SiteProc | Order ID: ${orderId} | Project: ${order.projects?.name || 'N/A'} | Requested by: ${order.profiles?.first_name} ${order.profiles?.last_name}`,
      Memo: order.description
    }

    // Create Purchase Order in QuickBooks
    const result = await makeQBApiCall(companyId, realmId, '/purchaseorder', {
      method: 'POST',
      body: JSON.stringify(poPayload)
    })

    const qbPOId = result.PurchaseOrder?.Id

    if (!qbPOId) {
      return { success: false, error: 'Failed to create Purchase Order in QuickBooks' }
    }

    // Update order with QB PO ID
    await supabase
      .from('purchase_orders')
      .update({
        quickbooks_po_id: qbPOId,
        quickbooks_synced_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return { success: true, qbPOId }
  } catch (error) {
    console.error('Error syncing order to purchase order:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sync all approved expenses for a company
 */
export async function syncAllExpenses(companyId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: []
  }

  try {
    const supabase = createServiceClient()

    // Check QB connection
    const connectionStatus = await getConnectionStatus(companyId)
    if (!connectionStatus.connected || !connectionStatus.realmId) {
      result.success = false
      result.errors.push('QuickBooks not connected')
      return result
    }

    const realmId = connectionStatus.realmId

    // Get vendor mappings
    const { data: mappings } = await supabase
      .from('quickbooks_vendor_mappings')
      .select('*')
      .eq('company_id', companyId)

    const vendorMappings: VendorMapping[] = mappings?.map(m => ({
      siteprocVendor: m.siteproc_vendor,
      quickbooksVendorId: m.quickbooks_vendor_id,
      quickbooksVendorName: m.quickbooks_vendor_name
    })) || []

    // Get all approved expenses not yet synced
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .is('quickbooks_bill_id', null)

    if (error) {
      result.success = false
      result.errors.push(`Failed to fetch expenses: ${error.message}`)
      return result
    }

    if (!expenses || expenses.length === 0) {
      return result // Nothing to sync
    }

    // Sync each expense
    for (const expense of expenses) {
      const syncResult = await syncExpenseToBill(companyId, realmId, expense.id, vendorMappings)
      
      if (syncResult.success) {
        result.synced++
      } else {
        result.failed++
        result.errors.push(`Expense ${expense.id}: ${syncResult.error}`)
      }
    }

    // Log sync operation
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (connection) {
      await logSync(
        connection.id,
        'full',
        result.failed === 0 ? 'success' : result.synced > 0 ? 'partial' : 'failed',
        result.synced,
        result.failed,
        result.errors.join('; ')
      )

      // Update last sync time
      await supabase
        .from('quickbooks_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connection.id)
    }

    result.success = result.failed === 0

  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Sync all approved orders for a company
 */
export async function syncAllOrders(companyId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: []
  }

  try {
    const supabase = createServiceClient()

    // Check QB connection
    const connectionStatus = await getConnectionStatus(companyId)
    if (!connectionStatus.connected || !connectionStatus.realmId) {
      result.success = false
      result.errors.push('QuickBooks not connected')
      return result
    }

    const realmId = connectionStatus.realmId

    // Get vendor mappings
    const { data: mappings } = await supabase
      .from('quickbooks_vendor_mappings')
      .select('*')
      .eq('company_id', companyId)

    const vendorMappings: VendorMapping[] = mappings?.map(m => ({
      siteprocVendor: m.siteproc_vendor,
      quickbooksVendorId: m.quickbooks_vendor_id,
      quickbooksVendorName: m.quickbooks_vendor_name
    })) || []

    // Get all approved orders not yet synced
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .is('quickbooks_po_id', null)

    if (error) {
      result.success = false
      result.errors.push(`Failed to fetch orders: ${error.message}`)
      return result
    }

    if (!orders || orders.length === 0) {
      return result // Nothing to sync
    }

    // Sync each order
    for (const order of orders) {
      const syncResult = await syncOrderToPurchaseOrder(companyId, realmId, order.id, vendorMappings)
      
      if (syncResult.success) {
        result.synced++
      } else {
        result.failed++
        result.errors.push(`Order ${order.id}: ${syncResult.error}`)
      }
    }

    // Log sync operation
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (connection) {
      await logSync(
        connection.id,
        'full',
        result.failed === 0 ? 'success' : result.synced > 0 ? 'partial' : 'failed',
        result.synced,
        result.failed,
        result.errors.join('; ')
      )
    }

    result.success = result.failed === 0

  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Get all unique vendors from expenses and orders
 */
export async function getUniqueVendors(companyId: string): Promise<string[]> {
  const supabase = createServiceClient()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('vendor')
    .eq('company_id', companyId)
    .not('vendor', 'is', null)

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('vendor')
    .eq('company_id', companyId)
    .not('vendor', 'is', null)

  const vendors = new Set<string>()

  expenses?.forEach(e => e.vendor && vendors.add(e.vendor))
  orders?.forEach(o => o.vendor && vendors.add(o.vendor))

  return Array.from(vendors).sort()
}

/**
 * Get QuickBooks vendors
 */
export async function getQuickBooksVendors(
  companyId: string,
  realmId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const result = await queryQB(companyId, realmId, 'SELECT * FROM Vendor MAXRESULTS 1000')
    
    const vendors = result.QueryResponse?.Vendor || []
    return vendors.map((v: any) => ({
      id: v.Id,
      name: v.DisplayName
    }))
  } catch (error) {
    console.error('Error fetching QB vendors:', error)
    return []
  }
}
