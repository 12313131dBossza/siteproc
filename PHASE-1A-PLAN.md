# Phase 1A: Deliveries Workflow Implementation Plan

**Status:** 🟡 IN PROGRESS  
**Date Started:** October 20, 2025 | 10:40 AM (America/New_York)  
**Estimated Duration:** 4-6 hours  

---

## 📋 Current State Analysis

### Database Schema (✅ Ready)
- `deliveries` table: id, company_id, job_id, po_id, status, delivered_at, signer_name, signature_url, notes, created_at, updated_at
- `delivery_items` table: id, company_id, delivery_id, description, qty, unit, sku, partial, created_at
- Status enum: `delivery_status` (pending | partial | delivered)
- Indexes: company_job_idx, company_delivery_idx
- RLS: Not yet fully configured (will be in Phase 3.5)

### UI Components (✅ Partially Complete)
- `/deliveries` page exists with:
  - List view with tabs (pending, partial, delivered)
  - Search & filtering
  - Status badges
  - RecordDeliveryForm component
  - Role-based access checks
- API endpoints exist but need enhancement:
  - `POST /api/deliveries` - Create delivery
  - `GET /api/deliveries` - List deliveries

### Missing / Incomplete (❌ To Do)
1. **Workflow State Machine** - Status transitions not enforced
2. **Lock Mechanism** - Delivered records should be immutable
3. **Auto-Update Orders** - No trigger to sync order status
4. **Auto-Update Projects** - No trigger to update project actuals
5. **Live Refresh** - No WebSocket or real-time updates
6. **Activity Logging** - Not integrated with delivery mutations
7. **POD Upload** - Proof of delivery upload not complete
8. **Role-Based Actions** - Update/edit restrictions missing

---

## 🎯 Phase 1A Implementation Tasks

### Task 1: Enhance Delivery API Endpoints
**File:** `src/app/api/deliveries/route.ts`

Requirements:
- ✅ GET: List deliveries with filtering (status, date range, order_id)
- ✅ POST: Create delivery (with validation)
- ❌ PATCH: Update delivery status (with workflow validation)
- ❌ DELETE: Soft delete (mark as archived)
- ✅ Activity logging for all mutations
- ✅ Real-time broadcasts after mutations

Changes:
```
1. Add PATCH handler for status updates
   - Validate state transitions (pending → partial, partial → delivered, etc.)
   - Lock check (reject if already delivered and locked)
   - Auto-call updateOrderAndProjectActuals() after state change
   - Create activity log entry
   
2. Add DELETE handler for archiving
   - Mark as deleted, don't actually delete
   - Create activity log entry
   
3. Enhance validation
   - Require items when transitioning to delivered
   - Verify all items have quantities
   - Check role permissions before allowing state changes
```

### Task 2: Update Deliveries Page UI
**File:** `src/app/deliveries/page.tsx`

Requirements:
- ✅ Display list (already done)
- ❌ Add status transition buttons (Pending → In Transit, In Transit → Delivered)
- ❌ Lock icon + read-only mode for delivered items
- ❌ POD upload button (Proof of Delivery)
- ❌ Disable edit for delivered records
- ❌ Toast notifications for status changes
- ❌ Modal for confirming delivery with items and signature

Changes:
```
1. Add DeliveryStatusTransition modal
   - Show items being delivered
   - Driver name field (for In Transit)
   - Signature capture (for Delivered)
   - Confirm delivery button
   
2. Add POD upload section
   - File upload input (5MB limit)
   - Display proof_url if exists
   - Show upload status
   
3. Add action buttons row
   - "Record In Transit" button (if pending/partial)
   - "Mark Delivered" button (if partial/pending)
   - "View POD" button (if delivered and has proof_url)
   - Disable for role without permission
   
4. Add real-time updates
   - Subscribe to delivery channel
   - Auto-refresh when delivery changes
   - Auto-refresh orders/projects when delivery changes
```

### Task 3: Create Auto-Update Orders & Projects Function
**File:** `src/lib/delivery-sync.ts` (NEW)

Requirements:
- Called after delivery status changes
- Calculate delivery progress for each order
- Update order status based on delivery progress
- Calculate project actuals from all deliveries + expenses
- Recalculate project variance

Logic:
```typescript
async function updateOrderAndProjectActuals(delivery_id: string, company_id: string) {
  // 1. Find orders affected by this delivery
  // 2. For each order, calculate:
  //    - Total ordered qty (from order_items)
  //    - Total delivered qty (sum of all delivery_items for this order)
  //    - Remaining qty
  //    - Delivered value (qty * unit_price for delivered items)
  // 3. Determine order status:
  //    - Pending: delivered_qty = 0
  //    - Partial: 0 < delivered_qty < ordered_qty
  //    - Delivered: delivered_qty >= ordered_qty
  // 4. Update orders table with new status + delivered_value
  // 5. Update project actuals:
  //    - actual_cost = SUM(delivery_items.qty * delivery_items.unit_price) + SUM(expenses)
  //    - variance = budget - actual_cost
  // 6. Create activity log
}
```

### Task 4: Implement Lock Mechanism for Delivered Records
**File:** `src/app/api/deliveries/route.ts` (enhance PATCH)

Requirements:
- Check if delivery status = 'delivered' before allowing updates
- Return 403 Forbidden if attempt to modify delivered delivery
- Allow only admin to unlock
- Log unlock attempts

Logic:
```typescript
// In PATCH handler
if (existingDelivery.status === 'delivered' && !isAdmin) {
  return NextResponse.json(
    { error: 'Delivered records are locked and cannot be modified' },
    { status: 403 }
  )
}
```

### Task 5: Integrate Activity Logging
**File:** `src/app/api/deliveries/route.ts`

Requirements:
- Log on CREATE: "Delivery created for order X"
- Log on UPDATE: "Delivery status changed from pending to partial"
- Log on DELETE: "Delivery archived"
- Include: user_id, actor name, timestamp, entity_id, metadata

Changes:
```typescript
// After each mutation
await logActivity({
  type: 'delivery',
  action: 'created|updated|deleted',
  title: `Delivery #${delivery.id} ${action}`,
  description: 'Details of what changed',
  entity_type: 'delivery',
  entity_id: delivery.id,
  metadata: { status: delivery.status, order_id: delivery.order_id }
})
```

### Task 6: Add Real-Time Updates (WebSocket)
**File:** `src/lib/realtime.ts` (enhance)

Requirements:
- Broadcast delivery updates to all connected clients
- Broadcast order updates when order status changes
- Broadcast project updates when project actuals change
- Include: entity_id, new_values, timestamp

Changes:
```typescript
// After delivery update
await broadcastDeliveryUpdated(delivery_id, company_id, {
  status: delivery.status,
  delivered_at: delivery.delivered_at
})

// After order update
await broadcastOrderUpdated(order_id, company_id, {
  status: order.status,
  delivered_value: order.delivered_value
})

// After project update
await broadcastProjectUpdated(project_id, company_id, {
  actual_cost: project.actual_cost,
  variance: project.variance
})
```

### Task 7: Add POD Upload & Storage
**File:** `src/app/api/deliveries/[id]/upload-proof/route.ts` (NEW)

Requirements:
- Accept POST with file (proof_url)
- Store in `/proofs/{delivery_id}` folder
- Generate 7-day signed URL
- Update delivery.proof_url
- Return signed URL to client
- Handle errors gracefully

Changes:
```typescript
// New endpoint: POST /api/deliveries/[id]/upload-proof
- File size limit: 5MB
- Allowed types: image/jpeg, image/png, application/pdf
- Store in Supabase Storage
- Create 7-day signed URL
- Update delivery.proof_url
- Log activity
```

---

## ✅ Acceptance Criteria for Phase 1A

1. **Workflow State Machine**
   - ✅ Can transition delivery status: pending → partial → delivered
   - ✅ Cannot revert delivered status (locked)
   - ✅ Only authorized roles can change status

2. **Auto-Updates**
   - ✅ Order status updates automatically when delivery changes
   - ✅ Order delivered_value calculated correctly
   - ✅ Project actual_cost updates automatically
   - ✅ Project variance recalculates automatically
   - ✅ Changes persist after page refresh

3. **Activity Logging**
   - ✅ All delivery mutations logged
   - ✅ Activity Log page shows delivery changes
   - ✅ Includes actor, action, timestamp, entity

4. **Live Refresh**
   - ✅ Delivery list updates when status changes
   - ✅ Order list updates when linked deliveries change
   - ✅ Project list updates when linked deliveries change
   - ✅ No need to manually refresh

5. **POD Upload**
   - ✅ Can upload proof of delivery
   - ✅ File size limit enforced (5MB)
   - ✅ Signed URL generated
   - ✅ Proof displayed in delivery details

6. **Role-Based Access**
   - ✅ Only users with 'editor' or 'admin' role can change status
   - ✅ Other roles see read-only view
   - ✅ Proper 403 responses for unauthorized actions

---

## 📅 Implementation Timeline

- **Step 1** (30 min): Enhance delivery API (PATCH, DELETE, validation)
- **Step 2** (45 min): Create auto-update logic for orders/projects
- **Step 3** (60 min): Update deliveries page UI with modals/buttons
- **Step 4** (30 min): Integrate activity logging
- **Step 5** (30 min): Add real-time broadcast support
- **Step 6** (45 min): Add POD upload endpoint
- **Step 7** (30 min): Test full workflow & fix issues

**Total Estimated:** 4-5 hours

---

## 🔗 Related Files

- Database: `sql/schema.sql` (deliveries, delivery_items)
- API: `src/app/api/deliveries/route.ts`, `[id]/route.ts`
- UI: `src/app/deliveries/page.tsx`, components
- Utils: `src/lib/audit.ts`, `src/lib/realtime.ts`
- Components: `src/components/RecordDeliveryForm.tsx`

---

## Next Steps

1. Start with API enhancements (PATCH handler)
2. Create order/project sync logic
3. Update UI with new buttons/modals
4. Test full workflow end-to-end
5. Move to Phase 1B (Orders × Deliveries Sync) once accepted

