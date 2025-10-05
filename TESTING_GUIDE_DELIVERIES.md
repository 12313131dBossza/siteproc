# Quick Testing Guide - Orders × Deliveries Sync

## Step 1: Apply Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `orders-deliveries-sync-migration.sql`
3. Paste and run the entire script
4. Verify success messages in output
5. Check that new columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name IN ('delivery_progress', 'ordered_qty', 'delivered_qty', 'remaining_qty', 'delivered_value');
```

## Step 2: Test Frontend Changes

### View Existing Orders
1. Navigate to `/orders` page
2. **Expected**: See existing orders with status badges
3. **New**: Should see delivery progress badges if data exists
4. **New**: Two rows of filter tabs (Order Status + Delivery Progress)

### Test Delivery Progress Filters
1. Click "Pending Delivery" tab
2. **Expected**: Only shows orders with no deliveries
3. Click "Partial" tab
4. **Expected**: Shows partially delivered orders
5. Click "Completed Delivery" tab
6. **Expected**: Shows fully delivered orders

### View Order Details
1. Click eye icon on any order
2. **Expected**: Order detail modal opens
3. **New**: If order has delivery_progress, see blue card with stats:
   - Ordered Qty
   - Delivered Qty
   - Remaining Qty
   - Delivered Value
4. **New**: "View Deliveries" button visible

### View Deliveries
1. In order detail, click "View Deliveries"
2. **Expected**: Deliveries modal opens
3. If no deliveries: Shows empty state with truck icon
4. If deliveries exist: Shows list with:
   - Delivery date
   - Status badge
   - Driver & vehicle info
   - Delivery items breakdown

## Step 3: Test Auto-Update System

### Create Test Scenario
1. Create a new order OR use existing approved order
2. Note the order ID from URL or detail modal
3. Manually set ordered_qty:
```sql
UPDATE purchase_orders 
SET ordered_qty = 100 
WHERE id = 'YOUR-ORDER-ID';
```

### Add First Delivery
1. Go to Supabase → Deliveries table
2. Insert new delivery:
```sql
INSERT INTO deliveries (
  order_id, 
  delivery_date, 
  status, 
  driver_name, 
  vehicle_number, 
  notes, 
  total_amount, 
  company_id, 
  created_by
) VALUES (
  'YOUR-ORDER-ID',
  NOW(),
  'delivered',
  'Test Driver',
  'TEST-123',
  'Test delivery',
  500.00,
  'YOUR-COMPANY-ID',
  'YOUR-USER-ID'
);
```

3. Add delivery items:
```sql
INSERT INTO delivery_items (
  delivery_id,
  product_name,
  quantity,
  unit,
  unit_price,
  total_price
) VALUES (
  'YOUR-DELIVERY-ID',
  'Test Product',
  30,
  'units',
  10.00,
  300.00
);
```

### Verify Auto-Update
1. Check order was updated:
```sql
SELECT 
  id,
  description,
  delivery_progress,
  ordered_qty,
  delivered_qty,
  remaining_qty,
  delivered_value
FROM purchase_orders
WHERE id = 'YOUR-ORDER-ID';
```

2. **Expected Results**:
   - delivery_progress = 'partially_delivered'
   - ordered_qty = 100
   - delivered_qty = 30
   - remaining_qty = 70
   - delivered_value = 300.00

3. Refresh orders page
4. **Expected**: Badge changes to blue "Partial"

### Complete Delivery
1. Add second delivery with remaining 70 units
2. **Expected**: 
   - delivery_progress = 'completed'
   - delivered_qty = 100
   - remaining_qty = 0
   - Badge changes to green "Completed"

## Step 4: Test Edge Cases

### Case 1: Delete Delivery
1. Delete a delivery item
2. **Expected**: Order recalculates automatically
3. **Expected**: Progress updates accordingly

### Case 2: Change Delivery Status
1. Update delivery status from 'delivered' to 'pending'
```sql
UPDATE deliveries 
SET status = 'pending' 
WHERE id = 'YOUR-DELIVERY-ID';
```
2. **Expected**: Order recalculates (doesn't count pending deliveries)
3. **Expected**: delivered_qty decreases

### Case 3: Multiple Deliveries
1. Add 3 partial deliveries
2. **Expected**: All counted correctly
3. **Expected**: Progress shows "Partial" until fully delivered

### Case 4: No Deliveries
1. Create new order
2. **Expected**: delivery_progress = 'pending_delivery'
3. **Expected**: Yellow badge
4. **Expected**: View Deliveries shows empty state

## Step 5: UI/UX Testing

### Modal Interactions
- [ ] Click outside modal → closes
- [ ] Click X button → closes
- [ ] Animations smooth (slide in, fade)
- [ ] Backdrop blur visible
- [ ] Scrolling works for long lists

### Responsive Design
- [ ] Test on mobile width (< 640px)
- [ ] Filter tabs wrap properly
- [ ] Modals fit screen
- [ ] Buttons stack vertically on small screens

### Performance
- [ ] Orders load quickly
- [ ] Deliveries modal loads within 1s
- [ ] No console errors
- [ ] Smooth transitions

## Expected Console Output

### Successful Delivery Fetch
```
GET /api/orders/[id]/deliveries 200
```

### Error Scenarios
```
GET /api/orders/[id]/deliveries 404 - Order not found
GET /api/orders/[id]/deliveries 403 - Access denied
```

## Troubleshooting

### Issue: Badges not showing
**Solution**: Run migration, verify delivery_progress column exists

### Issue: Counts incorrect in tabs
**Solution**: Check that filters reference correct field (delivery_progress)

### Issue: Trigger not firing
**Solution**: 
```sql
-- Check triggers exist
SELECT * FROM information_schema.triggers 
WHERE event_object_table IN ('deliveries', 'delivery_items');

-- Manually recalculate
SELECT calculate_order_delivery_progress('YOUR-ORDER-ID');
```

### Issue: API returns 404
**Solution**: Verify user has access to order's company, check RLS policies

### Issue: Foreign key error
**Solution**: Ensure order exists before creating delivery, check order_id is valid UUID

## Success Criteria

All items should pass:
- [ ] Migration runs without errors
- [ ] New columns visible in database
- [ ] Triggers created successfully
- [ ] Delivery progress badges display
- [ ] Filter tabs work correctly
- [ ] Order detail shows progress stats
- [ ] View Deliveries button opens modal
- [ ] Deliveries list displays correctly
- [ ] Auto-calculation works on delivery changes
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Responsive on mobile

## Demo Script

For stakeholder demo:
1. Show orders list with different progress states
2. Filter by "Partial" to show in-progress orders
3. Open order detail → show progress card
4. Click "View Deliveries" → show linked deliveries
5. Create new delivery in background
6. Refresh page → show automatic update
7. Explain benefits: visibility, tracking, automation

---

**Ready to test!** Start with Step 1 (database migration) and work through sequentially.
