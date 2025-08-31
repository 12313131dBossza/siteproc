# Toko Module - Product Catalog & Orders

## Overview
The Toko module provides a lightweight product catalog system where users can browse products and submit order requests. Administrators can manage products and approve/reject orders.

## Features
- **Product Management**: Admins can add, edit, and delete products
- **Order Requests**: All authenticated users can request product orders
- **Role-based Access**: Different UI and permissions based on user role
- **Real-time Updates**: Toasts for success/error feedback
- **Search & Filtering**: Filter products by category and search by name/SKU

## Database Tables

### Products
- `id` (uuid, primary key)
- `name` (text, required)
- `sku` (text, optional)
- `category` (text, optional)
- `supplier_id` (uuid, foreign key to suppliers)
- `price` (numeric, default 0)
- `stock` (integer, default 0)
- `unit` (text, default 'pcs')
- `created_at` (timestamptz)
- `created_by` (uuid, foreign key to auth.users)

### Orders
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key to products)
- `user_id` (uuid, foreign key to auth.users)
- `qty` (integer, required, > 0)
- `note` (text, optional)
- `status` (enum: 'pending', 'approved', 'rejected')
- `created_at` (timestamptz)
- `decided_by` (uuid, foreign key to auth.users)
- `decided_at` (timestamptz)

## Setup Instructions

### 1. Run SQL Schema
Execute the SQL commands in `sql/toko-schema.sql` in your Supabase SQL Editor:
```sql
-- Creates products and orders tables with RLS policies
-- See sql/toko-schema.sql for complete schema
```

### 2. Environment Variables
Ensure these environment variables are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. User Roles
The system expects users to have a `role` field in the `profiles` table:
- `owner`: Full admin access
- `admin`: Full admin access
- `member`: Can only view products and request orders (default)

## Usage

### Accessing Toko
Navigate to `/toko` in your application. The page is accessible to all authenticated users.

### For Regular Users (Members)
- Browse product catalog
- Search and filter products
- Request orders by clicking "Request Order" on any product
- View order status (pending/approved/rejected)

### For Administrators (Owner/Admin)
- All member capabilities plus:
- Add new products via "Add Product" button
- Edit existing products via edit icon
- Delete products via delete icon
- View all orders from all users
- Approve or reject pending orders

### Product Fields
- **Name**: Required product name
- **SKU**: Optional stock keeping unit
- **Category**: Optional category for filtering
- **Supplier**: Optional link to existing supplier
- **Price**: Product price (numeric)
- **Stock**: Available quantity
- **Unit**: Unit of measurement (pcs, kg, bags, etc.)

### Order Process
1. User clicks "Request Order" on a product
2. Fills in quantity and optional notes
3. Order is created with status "pending"
4. Admin can approve or reject the order
5. User sees updated status

## Security (RLS Policies)

### Products
- **Read**: All authenticated users can view products
- **Write**: Only admin/owner roles can create, update, delete products

### Orders
- **Read**: Users see their own orders; admins see all orders
- **Create**: Users can create orders for themselves
- **Update**: Only admins can update order status (approve/reject)

## Technical Notes

### Dependencies Added
- `sonner`: For toast notifications
- `@supabase/ssr`: For server-side rendering support

### File Structure
```
src/
├── app/(admin)/toko/page.tsx      # Main Toko page component
├── lib/supabase-client.ts         # Client-side Supabase helper
└── sql/toko-schema.sql            # Database schema
```

### Styling
Uses the existing AdminDashboard styling patterns:
- Tailwind CSS with zinc/indigo color palette
- Rounded-2xl cards and components
- Lucide icons for consistency
- Responsive grid layouts

## Error Handling
- Form validation for required fields
- Toast notifications for success/error states
- Graceful handling of network errors
- Loading states during data fetching

## Future Enhancements
- Image uploads for products
- Inventory tracking with order fulfillment
- Order history and reporting
- Bulk product import/export
- Product categories management
- Order workflow with multiple approval stages
