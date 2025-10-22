# Comprehensive System Stabilization Plan

## Overview
Apply the same one-shot fix pattern (schema + RLS + API hardening) used successfully for Deliveries and Expenses to all remaining core modules.

## ✅ Already Fixed (Working)
1. **Deliveries** (`deliveries`, `delivery_items`)
   - Schema normalized, RLS installed, API hardened
   - Status transitions working (pending → partial → delivered)
   
2. **Expenses** (`expenses`)
   - Schema normalized, RLS + SECURITY DEFINER helper, API hardened
   - Approval workflow working

## 🔧 Modules to Fix (Priority Order)

### Priority 1: Core Transaction Modules

#### 1. **Change Orders** (page shows "No pending change requests")
- **Tables**: `change_orders`
- **Issues**: Likely missing columns, RLS not set, visibility problems
- **Fix**:
  - Schema normalize (status, company_id, created_by, approved_by/at, project_id)
  - RLS policies (company read, creator insert/update, approver update)
  - API: GET/POST `/api/change-orders` + `/api/change-orders/[id]`
  - Debug endpoint: `/api/change-orders-debug`

#### 2. **Orders** (purchase_orders)
- **Tables**: `purchase_orders`, `order_items`
- **Status**: Table created earlier; may need RLS + API hardening
- **Fix**:
  - Verify schema (status, company_id, project_id, created_by, approved_by/at)
  - RLS policies (company read, creator CRUD, approver transitions)
  - API: Harden GET/POST `/api/orders`, `/api/purchase-orders`
  - Sync with deliveries (order status updates when delivered)

#### 3. **Projects**
- **Tables**: `projects`
- **Issues**: May have visibility/RLS gaps
- **Fix**:
  - Schema check (company_id, created_by, status, budget fields, actual costs)
  - RLS policies (company read, admin/manager CRUD)
  - API: `/api/projects` GET/POST, `/api/projects/[id]` PATCH
  - Integrate with orders/deliveries/expenses for actuals tracking

#### 4. **Payments**
- **Tables**: `payments`
- **Issues**: Approval workflow may be incomplete
- **Fix**:
  - Schema (status, company_id, paid_by, approved_by/at, project_id, invoice references)
  - RLS (company read, bookkeeper/admin approve)
  - API: `/api/payments` GET/POST, approve endpoint

#### 5. **Products** (Inventory)
- **Tables**: `products`, `inventory_adjustments`
- **Issues**: Stock tracking, company isolation
- **Fix**:
  - Schema (company_id, current_stock, reorder_level, last_updated)
  - RLS (company read/write)
  - API: `/api/products` with stock update logic

### Priority 2: Supporting Modules

#### 6. **Jobs** (Work Orders)
- **Tables**: `jobs` (or `work_orders`)
- **Fix**: Schema + RLS + API for job tracking linked to projects

#### 7. **RFQs & Quotes**
- **Tables**: `rfqs`, `quotes`
- **Fix**: Supplier bidding workflow + RLS

#### 8. **Purchase Orders (POs)**
- **Tables**: `pos` (if separate from purchase_orders)
- **Fix**: Supplier order tracking + approval

#### 9. **Suppliers**
- **Tables**: `suppliers`
- **Fix**: Company-scoped supplier management

#### 10. **Contractors & Clients**
- **Tables**: `contractors`, `clients`
- **Fix**: Company-scoped relationship management

#### 11. **Bids**
- **Tables**: `bids`
- **Fix**: Bidding workflow + approval

### Priority 3: Administrative

#### 12. **Users & Profiles**
- **Tables**: `profiles`, `auth.users`
- **Fix**: Ensure profile.company_id consistency, role enforcement

#### 13. **Activity Logs**
- **Tables**: `activity_logs` (or `events`)
- **Fix**: Company-scoped audit trail

#### 14. **Reports**
- **APIs**: `/api/reports/*`
- **Fix**: Ensure all report queries respect company_id

## 🛠️ Standard Fix Pattern (Per Module)

### 1. Schema Normalization SQL
```sql
-- <MODULE>-SCHEMA-NORMALIZE.sql
-- Add missing columns: company_id, user_id/created_by, status, approved_by/at, updated_at
-- Add indexes, triggers, constraints
-- Backfill defaults
```

### 2. RLS Policies SQL
```sql
-- <MODULE>-RLS-POLICIES.sql
-- Create SECURITY DEFINER helper if needed
-- SELECT: company members
-- INSERT: authenticated users with company check
-- UPDATE: creator for pending, approvers for status changes
-- DELETE: admin only or lock on completed
```

### 3. Backfill SQL
```sql
-- BACKFILL-<MODULE>.sql
-- Set company_id from profiles via user_id
-- Set status defaults
-- Sync fields (approved_* from decided_*)
```

### 4. API Hardening
- Use `sbServer()` for SSR auth context
- Add service-role fallback for admin/bookkeeper when RLS returns zero
- Validate company_id match on all operations
- Add `/api/<module>-debug` endpoint (service-role)

### 5. Testing Checklist
- [ ] GET lists data with no debug flag
- [ ] POST creates records attributed to user/company
- [ ] Status transitions work (pending → approved/rejected/completed)
- [ ] Approvers can approve/reject within company
- [ ] Creators can edit their own pending items
- [ ] Admin debug endpoint shows all data

## 📋 Next Steps

1. **Immediate (tonight)**:
   - Fix Change Orders (empty state blocker)
   - Fix Orders/Purchase Orders (already have table, need RLS)
   
2. **Short-term (next session)**:
   - Projects (actuals tracking integration)
   - Payments (approval workflow)
   - Products (inventory visibility)
   
3. **Medium-term**:
   - Jobs, RFQs, Quotes, POs, Suppliers
   - Contractors, Clients, Bids
   
4. **Long-term**:
   - Users/Profiles consistency enforcement
   - Activity logs consolidation
   - Reports verification

## 🎯 Success Criteria
- All pages load without empty states or errors
- All lists show company-scoped data
- Create/Edit/Delete works end-to-end
- Approval workflows function correctly
- No debug fallback flags in production responses
- All module APIs have debug endpoints for verification
