# Fix Orders Table Schema

## Problem
The `orders` table in the database has the wrong structure. The API expects:
- `project_id`, `amount`, `description`, `category`

But the database has:
- `product_id`, `qty`, `notes`, `status`

This causes **500 Internal Server Error** when creating orders.

## Solution
Run the migration SQL to update the table structure.

## Steps

### 1. Go to Supabase Dashboard
- Open your project at https://supabase.com
- Navigate to **SQL Editor**

### 2. Run the Migration
- Copy the contents of `sql/migrate-orders-table.sql`
- Paste into SQL Editor
- Click **Run**

### 3. Verify Success
You should see:
```
Orders table migrated successfully!
New structure: project_id, amount, description, category, status, requested_by, etc.
```

### 4. Test
- Go to `/orders/new` in your app
- Select a product
- Select a project
- Enter quantity
- Click "Create Order"
- Should work without errors!

## What the Migration Does
1. Drops old `orders` table with product-based structure
2. Creates new `orders` table for project approval workflow
3. Sets up RLS policies for company-scoped access
4. Creates indexes for performance
5. Adds auto-update trigger for `updated_at` field

## Important Notes
- ⚠️ **This will delete all existing orders!** If you have important order data, back it up first.
- The new structure supports a project-based approval workflow
- Orders are scoped to company (via projects)
- Only admins/managers can approve/reject orders
