# Activity Log Setup Instructions

## Step 1: Execute Database Script

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a **New Query**
4. Copy the entire contents of `create-activity-logs-table.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

### What This Script Does:
- ✅ Creates `activity_type` enum (delivery, expense, order, project, payment, user, change_order, product, other)
- ✅ Creates `activity_action` enum (created, updated, deleted, approved, rejected, submitted, completed, cancelled, status_changed, invited, processed, failed)
- ✅ Creates `activity_logs` table with all necessary columns
- ✅ Adds indexes for fast queries
- ✅ Configures RLS (Row Level Security) policies
- ✅ Creates `log_activity()` helper function
- ✅ Inserts 3 example activities for testing
- ✅ Creates materialized view for stats (optional)

### Expected Output:
You should see multiple "Success" messages indicating:
- Types created
- Table created
- Indexes created
- Policies created
- Function created
- Example data inserted

### Verify Installation:
Run these queries to check everything worked:

```sql
-- Check the table exists and has data
SELECT COUNT(*) as total_activities FROM activity_logs;

-- View recent activities
SELECT 
    type,
    action,
    title,
    user_name,
    created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 10;

-- Test the helper function
SELECT log_activity(
    'delivery'::activity_type,
    'created'::activity_action,
    'Test Delivery Created',
    'Testing the activity log system',
    auth.uid(),
    NULL,
    'delivery',
    NULL,
    '{"test": true}'::jsonb,
    'success',
    NULL
);
```

---

## Step 2: Test the Activity Log Page

1. Navigate to http://localhost:3000/activity
2. You should see:
   - ✅ Stats cards showing activity counts
   - ✅ List of activities (at least the 3 example activities)
   - ✅ Filters working (type, status, search)
   - ✅ Tabs working (All, Today, This Week, This Month)
   - ✅ Click "View Details" on any activity to see modal

---

## Step 3: Hook Activity Logging into APIs

Once the database is set up, we need to add logging to all CRUD operations.

### Files to Update:
1. `src/app/api/orders/route.ts` - Log order creation/approval
2. `src/app/api/order-deliveries/route.ts` - Log delivery creation/status change
3. `src/app/api/expenses/route.ts` - Log expense creation/approval
4. `src/app/api/projects/route.ts` - Log project creation
5. `src/app/api/payments/route.ts` - Log payment processing

### Example Usage:
```typescript
import { logActivity } from '@/app/api/activity/route';

// After creating an order
await logActivity({
  type: 'order',
  action: 'created',
  title: `Purchase Order Created`,
  description: `Order for ${orderData.description}`,
  entity_type: 'order',
  entity_id: newOrder.id,
  metadata: {
    order_id: newOrder.id,
    amount: newOrder.amount,
    project_id: newOrder.project_id
  },
  status: 'success',
  amount: newOrder.amount
});

// After approving an order
await logActivity({
  type: 'order',
  action: 'approved',
  title: `Purchase Order Approved`,
  description: `Order #${order.id} approved`,
  entity_type: 'order',
  entity_id: order.id,
  metadata: { order_id: order.id, approved_by: profile.full_name },
  status: 'success'
});
```

---

## API Endpoints

### GET /api/activity
Fetch activity logs with filtering and pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `type` - Filter by type (delivery, expense, order, etc.)
- `action` - Filter by action (created, approved, etc.)
- `status` - Filter by status (success, pending, failed, warning)
- `user_id` - Filter by user
- `entity_type` - Filter by entity type
- `entity_id` - Filter by specific entity
- `start_date` - Filter by start date (ISO 8601)
- `end_date` - Filter by end date (ISO 8601)
- `search` - Search in title, description, user_name

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "type": "delivery",
      "action": "created",
      "title": "Delivery #D-102 Created",
      "description": "8 pallets of cement scheduled",
      "user_id": "uuid",
      "user_name": "John Doe",
      "user_email": "john@company.com",
      "company_id": "uuid",
      "entity_type": "delivery",
      "entity_id": "uuid",
      "metadata": {"delivery_id": "D-102", "items": 8},
      "status": "success",
      "amount": null,
      "created_at": "2025-10-06T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2
  },
  "stats": {
    "total": 100,
    "total_today": 5,
    "total_week": 25,
    "unique_users": 3,
    "most_active_type": "delivery",
    "by_type": {"delivery": 40, "expense": 30, "order": 30},
    "by_status": {"success": 90, "pending": 5, "failed": 5}
  }
}
```

### POST /api/activity
Create a new activity log entry.

**Request Body:**
```json
{
  "type": "delivery",
  "action": "created",
  "title": "Delivery Created",
  "description": "Optional description",
  "entity_type": "delivery",
  "entity_id": "uuid",
  "metadata": {"key": "value"},
  "status": "success",
  "amount": 1000.00
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "type": "delivery",
    "action": "created",
    ...
  }
}
```

---

## Next Steps

After the Activity Log is fully integrated:

1. ✅ Phase 1G: Build Reports Module
2. ✅ Phase 1C: Create Project Auto-Calc Triggers
3. ✅ Phase 1A: Add POD Upload to Deliveries
4. ✅ Phase 1D: Link Expenses to Project Actuals

---

## Troubleshooting

### Issue: "activity_type does not exist"
- The enum wasn't created. Re-run the SQL script.

### Issue: "relation 'activity_logs' does not exist"
- The table wasn't created. Re-run the SQL script.

### Issue: "permission denied for table activity_logs"
- RLS policies not applied. Re-run the SQL script or check your auth session.

### Issue: No activities showing on page
- Check browser console for errors
- Verify `/api/activity` endpoint returns data
- Check that you're logged in and have a company_id

### Issue: Stats showing 0
- Activities may not be in the current time range
- Try looking at "All Activity" tab
- Check that activities have valid `created_at` timestamps

---

**Created:** October 6, 2025  
**Status:** Activity Log database and API ready. Needs integration into CRUD operations.
