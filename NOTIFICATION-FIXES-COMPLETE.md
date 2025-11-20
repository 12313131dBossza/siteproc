# 🔔 Notification System Fixes - Complete

## Problem Summary
User reported that notifications were not appearing for:
1. ❌ Expense approvals/rejections
2. ❌ Payment status updates
3. ❌ Delivery completions

Only **order approvals** were working correctly.

## Root Cause Analysis

### 1. Expense Notifications - Missing Field
**Problem**: Expense creation endpoint didn't set `submitted_by` field
- Notification code in `expenses/[id]/approve/route.ts` checks: `if (expense.submitted_by)`
- Since field was `null`, notification never triggered

**Location**: `src/app/api/expenses/route.ts` line 115-127

### 2. Payment Notifications - Not Implemented
**Problem**: Payment PATCH endpoint had no notification code
- Only payment **creation** sent notifications
- Payment **status updates** (approved/paid/rejected) had zero notification logic

**Location**: `src/app/api/payments/[id]/route.ts` line 90-110

### 3. Delivery Notifications - Insufficient Logging
**Problem**: Code existed but no debug logging to diagnose failures
- Missing verbose logging to track notification flow
- Silent failures if `order_id` was null or query failed

**Location**: `src/app/api/order-deliveries/[id]/mark-delivered/route.ts` line 158-179

---

## Fixes Implemented

### ✅ Fix 1: Expense Creation - Add `submitted_by` Field
**File**: `src/app/api/expenses/route.ts`

```typescript
const baseData: any = {
  vendor,
  category,
  amount,
  description: body.description || body.vendor || '',
  memo: body.memo || body.description || '',
  status: body.status || 'pending',
  company_id: profile.company_id,
  spent_at: spendDate,
  user_id: user.id,
  submitted_by: user.id, // ✅ ADDED: Set submitted_by for notification triggers
  receipt_url: body.receipt_url || null,
}
```

**Impact**: Now expense approval notifications will trigger because `submitted_by` exists

---

### ✅ Fix 2: Payment Status Updates - Add Notification Logic
**File**: `src/app/api/payments/[id]/route.ts`

**Added import**:
```typescript
import { notifyPaymentUpdated } from '@/lib/notification-triggers'
```

**Added notification logic** (after activity log, line ~90-140):
```typescript
// Create in-app notification for payment status change
if (existing.status !== updated.status) {
  try {
    // Fetch payment creator to notify them
    const { data: payment, error: paymentError } = await (sb as any)
      .from('payments')
      .select('created_by, company_id')
      .eq('id', updated.id)
      .single()

    if (!paymentError && payment && payment.created_by && payment.company_id) {
      // Fetch approver profile for name
      const { data: approverProfile } = await (sb as any)
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      const approverName = approverProfile?.full_name || session.user.email || 'Admin'

      console.log(`🔔 PAYMENT NOTIFICATION: Notifying user ${payment.created_by} about payment status change to ${updated.status}`)

      await notifyPaymentUpdated({
        paymentId: updated.id,
        creatorId: payment.created_by,
        companyId: payment.company_id,
        newStatus: updated.status,
        vendor: updated.vendor_name,
        amount: updated.amount,
        updaterName: approverName
      })

      console.log(`✅ Payment notification sent to user ${payment.created_by}`)
    }
  } catch (notifError) {
    console.error('Failed to create payment notification:', notifError)
    // Don't fail the request if notification fails
  }
}
```

**Impact**: Payment status changes now trigger notifications to payment creator

---

### ✅ Fix 3: Delivery Notifications - Enhanced Logging
**File**: `src/app/api/order-deliveries/[id]/mark-delivered/route.ts`

**Enhanced logging** (line ~152-192):
```typescript
// Create in-app notification for delivery completion
try {
  console.log(`🔔 DELIVERY: Attempting to create notification for delivery ${deliveryId}`)
  console.log(`🔔 DELIVERY: Order ID is ${delivery.order_id}`)
  
  // Get order details to find who to notify
  const { data: orderData, error: orderFetchError } = await supabase
    .from('purchase_orders')
    .select('created_by, company_id, order_number, projects(name)')
    .eq('id', delivery.order_id)
    .single()

  console.log(`🔔 DELIVERY: Order data fetched:`, { orderData, error: orderFetchError })

  if (orderData && orderData.created_by && orderData.company_id) {
    console.log(`🔔 DELIVERY: Sending notification to user ${orderData.created_by}`)
    
    // Extract project name from projects array
    const projectName = (orderData.projects as any)?.name || undefined
    
    await notifyDeliveryStatus({
      deliveryId: deliveryId,
      recipientUserIds: [orderData.created_by],
      companyId: orderData.company_id,
      deliveryNumber: delivery.delivery_number || undefined,
      projectName: projectName,
      newStatus: 'delivered',
      orderId: delivery.order_id || undefined
    })
    console.log(`✅ Delivery notification sent to user ${orderData.created_by}`)
  } else {
    console.warn(`⚠️ DELIVERY: Cannot send notification - missing data`, {
      hasOrderData: !!orderData,
      hasCreatedBy: orderData?.created_by,
      hasCompanyId: orderData?.company_id
    })
  }
} catch (notifError) {
  console.error('Failed to create delivery notification:', notifError)
}
```

**Impact**: Verbose logging will help diagnose if deliveries are missing `order_id` or other required fields

---

## Verification Checklist

After deployment, test the following:

### ✅ Expense Notifications
1. Create a new expense
2. Approve the expense
3. Verify notification appears in notifications dropdown
4. Check console logs for: `✅ In-app notification sent to user {id}`

### ✅ Payment Notifications  
1. Create a new payment
2. Update payment status (e.g., pending → paid)
3. Verify notification appears
4. Check console logs for: `✅ Payment notification sent to user {id}`

### ✅ Delivery Notifications
1. Create an order with delivery
2. Mark delivery as completed
3. Verify notification appears
4. Check console logs for delivery notification flow
5. If missing, verify `order_id` exists on delivery record

---

## What Works Now

| Feature | Status | Notification Trigger |
|---------|--------|---------------------|
| Order Approval | ✅ Working (confirmed) | User approves/rejects order |
| Order Rejection | ✅ Working (confirmed) | User approves/rejects order |
| Expense Approval | ✅ Fixed | User approves expense (now has `submitted_by`) |
| Expense Rejection | ✅ Fixed | User rejects expense (now has `submitted_by`) |
| Payment Creation | ✅ Working | New payment created (existing code) |
| Payment Status Update | ✅ Fixed | Payment status changed (new code) |
| Delivery Completion | ✅ Enhanced | Delivery marked as delivered (better logging) |

---

## Debug Tips

### If expense notifications still don't show:
1. Check browser console for: `🔔 TESTING MODE: Self-notifications enabled for expense`
2. Check if notification was created: `✅ In-app notification sent to user {id}`
3. Verify expense has `submitted_by` field populated
4. Check RLS policies on `notifications` table

### If payment notifications don't show:
1. Check logs for: `🔔 PAYMENT NOTIFICATION: Notifying user...`
2. Verify payment has `created_by` field
3. Check payment status actually changed (old !== new)

### If delivery notifications don't show:
1. Check logs for: `🔔 DELIVERY: Order ID is {id}`
2. Verify delivery has valid `order_id`
3. Check if order has `created_by` field
4. Look for warning: `⚠️ DELIVERY: Cannot send notification - missing data`

---

## Files Modified

1. ✅ `src/app/api/expenses/route.ts` - Added `submitted_by` field to baseData
2. ✅ `src/app/api/payments/[id]/route.ts` - Added notification logic for status updates
3. ✅ `src/app/api/order-deliveries/[id]/mark-delivered/route.ts` - Enhanced logging

---

## Next Steps

1. **Deploy changes** to production
2. **Test each notification type** manually
3. **Monitor console logs** for notification triggers
4. **Check database** if notifications exist but don't display (RLS issue)
5. **Verify frontend** notification polling/refresh works correctly

---

## Related Files

- **Notification Library**: `src/lib/notification-triggers.ts`
- **Notification Table**: `notifications` (Supabase)
- **Order Notifications**: `src/app/api/orders/[id]/route.ts` (working reference)
- **Expense Approval**: `src/app/api/expenses/[id]/approve/route.ts` (checks `submitted_by`)
