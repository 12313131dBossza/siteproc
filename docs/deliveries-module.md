# Order Deliveries Module Documentation

## Overview

The Order Deliveries module provides complete order fulfillment tracking functionality for SiteProc. It allows users to record delivery receipts, track delivery progress, manage delivery proofs, and automatically update order statuses based on delivery completion.

## Features

### Core Functionality
- ✅ **Record Deliveries**: Track partial and complete deliveries for order items
- ✅ **Delivery Proofs**: Upload and store delivery photos with secure signed URLs
- ✅ **Progress Tracking**: Real-time delivery progress visualization
- ✅ **Email Notifications**: Automatic notifications for delivery events
- ✅ **Status Management**: Automatic order status updates based on delivery completion
- ✅ **Role-Based Access**: Company-scoped access with role-based permissions

### Database Schema
- `deliveries` table with comprehensive tracking fields
- `order_delivery_summary` view for aggregated delivery statistics  
- Automated triggers to update order items and status
- Row-Level Security (RLS) policies for data isolation

### API Endpoints
- `POST /api/order-deliveries` - Create delivery records
- `GET /api/order-deliveries` - Fetch delivery records with pagination
- `POST /api/order-deliveries/upload` - Upload delivery proof files

### UI Components
- Order delivery panel on individual order pages
- Record delivery modal with validation
- Deliveries list page with filtering and pagination
- Progress bars and delivery status indicators

## Implementation Details

### Database Schema

#### Deliveries Table
```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delivered_qty DECIMAL(10,2) NOT NULL CHECK (delivered_qty > 0),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  proof_url TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Order Delivery Summary View
```sql
CREATE OR REPLACE VIEW order_delivery_summary AS
SELECT 
  o.id as order_id,
  o.company_id,
  SUM(oi.ordered_qty) as total_ordered_qty,
  COALESCE(SUM(oi.delivered_qty), 0) as total_delivered_qty,
  ROUND(
    CASE 
      WHEN SUM(oi.ordered_qty) = 0 THEN 0 
      ELSE (COALESCE(SUM(oi.delivered_qty), 0) / SUM(oi.ordered_qty)) * 100 
    END, 2
  ) as delivery_percentage,
  COALESCE(SUM(oi.delivered_qty), 0) >= SUM(oi.ordered_qty) as is_fully_delivered,
  COUNT(DISTINCT d.id) as delivery_count,
  MAX(d.delivered_at) as last_delivery_date
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN deliveries d ON o.id = d.order_id
WHERE o.status IN ('approved', 'partially_delivered', 'delivered')
GROUP BY o.id, o.company_id;
```

### Automated Triggers

#### Update Order Items Delivered Quantity
- Automatically updates `order_items.delivered_qty` when deliveries are created/updated/deleted
- Maintains accurate remaining quantity calculations

#### Update Order Status
- Automatically changes order status from `approved` to `partially_delivered` when first delivery is recorded
- Changes status to `delivered` when all items are fully delivered

### Row-Level Security (RLS) Policies

#### Access Control
- **View**: Users can only see deliveries from their company
- **Create**: Members and above can create deliveries for their company orders
- **Update**: Only admins can update existing delivery records
- **Delete**: Only admins can delete delivery records

### API Implementation

#### Create Delivery Endpoint
```typescript
POST /api/order-deliveries
{
  order_id: string,      // UUID of the order
  product_id: string,    // UUID of the product being delivered
  delivered_qty: number, // Quantity delivered (must be positive)
  delivered_at: string,  // ISO date string of delivery
  note?: string,         // Optional delivery notes
  proof_url?: string,    // Optional URL to delivery proof photo
  supplier_id?: string   // Optional supplier ID
}
```

#### Fetch Deliveries Endpoint
```typescript
GET /api/order-deliveries?order_id={uuid}&page=1&limit=50
{
  deliveries: Delivery[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

#### File Upload Endpoint
```typescript
POST /api/order-deliveries/upload
FormData {
  file: File,           // Image file (max 5MB)
  order_id: string,     // Order UUID
  product_id: string    // Product UUID
}

Response: {
  url: string,          // Signed URL for the uploaded file
  fileName: string,     // Generated filename
  filePath: string,     // Storage path
  size: number,         // File size in bytes
  contentType: string   // MIME type
}
```

### Email Notifications

#### Delivery Created
- **Recipients**: All admins, owners, and bookkeepers
- **Trigger**: When a delivery is recorded
- **Content**: Delivery details, product info, quantity delivered

#### Order Completed
- **Recipients**: Original order creator
- **Trigger**: When order becomes fully delivered
- **Content**: Completion notification with order summary

### UI Components

#### RecordDeliveryModal
- Form validation for delivery quantity vs. remaining quantity
- Date picker with max date of today
- File upload with image preview
- Progress indicators during upload and submission

#### Order Detail Page Delivery Panel
- Shows delivery progress for each order item
- Progress bars with completion percentages
- List of recent deliveries with details
- Record delivery buttons for eligible items

#### Order Deliveries List Page
- Paginated list of all delivery records
- Filtering by order ID
- Search and sorting capabilities
- Links to view full order details

## Role-Based Access Control

### Permissions Matrix
| Role | View Deliveries | Record Deliveries | Update Deliveries | Delete Deliveries |
|------|----------------|-------------------|-------------------|-------------------|
| Viewer | ✅ | ❌ | ❌ | ❌ |
| Member | ✅ | ✅ | ❌ | ❌ |
| Bookkeeper | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Owner | ✅ | ✅ | ✅ | ✅ |

### Company Isolation
All delivery records are scoped to the user's company through:
- Database-level RLS policies
- API endpoint company ID filtering
- UI components respecting company context

## File Storage

### Delivery Proofs
- Stored in Supabase Storage `private` bucket
- Path structure: `delivery-proofs/{company_id}/{order_id}/{product_id}/{filename}`
- Signed URLs with 24-hour expiry for secure access
- Maximum file size: 5MB
- Supported formats: Image files only

## Testing

### QA Test Suite
The included `qa-deliveries-test.js` script validates:
- ✅ Database schema integrity
- ✅ API endpoint functionality
- ✅ Database triggers execution
- ✅ Delivery summary view accuracy
- ✅ RLS policy enforcement
- ✅ Data cleanup procedures

### Running Tests
```bash
node qa-deliveries-test.js
```

## Migration

### Database Migration
The `supabase/migrations/20241220_deliveries_module.sql` file contains:
- Complete table creation
- View definitions
- Trigger functions
- RLS policy setup
- Index creation for performance

### Applying Migration
1. Apply to local development:
```bash
npx supabase db reset --local
```

2. Apply to production:
```bash
npx supabase db push
```

## Performance Considerations

### Database Indexes
- `idx_deliveries_order_id` - Fast delivery lookup by order
- `idx_deliveries_product_id` - Fast delivery lookup by product
- `idx_deliveries_company_id` - Company-scoped queries
- `idx_deliveries_delivered_at` - Date-based sorting and filtering
- `idx_deliveries_created_by` - User-based queries

### Query Optimization
- Use of database views for complex aggregations
- Pagination implemented for large datasets
- Selective field fetching in API responses

## Security

### Data Protection
- All file uploads validated for type and size
- Signed URLs prevent unauthorized access to delivery proofs
- RLS policies ensure company data isolation
- Input validation on all API endpoints

### Authentication
- All API endpoints require valid user authentication
- Role-based access control implemented at database level
- Service role used for trusted operations only

## Error Handling

### API Error Responses
```typescript
{
  error: string,              // Human-readable error message
  details?: ValidationError[] // Detailed validation errors (when applicable)
}
```

### Common Error Scenarios
- **Insufficient Permissions**: HTTP 401/403 responses
- **Validation Failures**: HTTP 400 with detailed field errors
- **Resource Not Found**: HTTP 404 responses
- **Server Errors**: HTTP 500 with generic error messages

## Monitoring and Analytics

### Metrics to Track
- Delivery completion rates by order/supplier
- Time between order approval and delivery
- Most frequently delivered products
- User activity in recording deliveries

### Audit Trail
- All delivery operations logged via audit system
- Includes user ID, action type, and relevant data changes
- Timestamp and company context for all operations

## Future Enhancements

### Planned Features
- [ ] Delivery scheduling and tracking
- [ ] Integration with shipping providers
- [ ] Bulk delivery import from CSV/Excel
- [ ] Delivery route optimization
- [ ] Mobile app for delivery teams
- [ ] Advanced reporting and analytics dashboard

### API Extensibility
The current API design supports future enhancements through:
- Versioned endpoints
- Extensible data models
- Plugin architecture for integrations
- Webhook support for external systems

## Troubleshooting

### Common Issues

#### Deliveries Not Showing Up
1. Check RLS policies are correctly applied
2. Verify user has correct company_id in profile
3. Ensure order status is 'approved' or 'partially_delivered'

#### File Upload Failures
1. Verify file size is under 5MB limit
2. Check file type is supported image format
3. Ensure Supabase Storage is properly configured
4. Verify storage bucket permissions

#### Email Notifications Not Sent
1. Check email service configuration (SendGrid/Resend)
2. Verify user profiles have valid email addresses
3. Check notification function execution logs
4. Ensure proper role assignments for recipients

### Debug Commands
```bash
# Check database schema
npx supabase db diff

# View migration status
npx supabase migration list

# Test email configuration
npm run test:emails

# Validate API endpoints
npm run test:api
```

## Support

For technical support or questions about the Order Deliveries module:

1. Review this documentation
2. Check the QA test suite for examples
3. Examine the API endpoint implementations
4. Review database migration files for schema details

## Changelog

### Version 1.0.0 (December 2024)
- ✅ Initial implementation
- ✅ Complete database schema
- ✅ API endpoints for CRUD operations
- ✅ File upload and storage
- ✅ Email notification system
- ✅ UI components and pages
- ✅ Role-based access control
- ✅ QA test suite
- ✅ Comprehensive documentation
