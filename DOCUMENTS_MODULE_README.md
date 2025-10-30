# Documents Module - Expense Receipts Integration

## ✅ Implementation Complete

The expense receipts upload feature has been successfully integrated! Here's what was implemented:

### Features Added

1. **Document Management Component** (`DocumentManager.tsx`)
   - Upload files (images, PDFs) up to 10MB
   - View documents with preview (images and PDFs supported)
   - Delete documents with confirmation
   - Download documents via signed URLs
   - Secure access with company-scoped permissions

2. **Expenses Page Integration**
   - "Documents" button on each expense card
   - Opens modal for uploading/viewing receipts
   - Linked to expense via `expense_id`
   - Document type automatically set to "receipt"

3. **API Endpoints**
   - `POST /api/documents` - Upload files with entity linking
   - `GET /api/documents?expense_id={id}` - List documents for expense
   - `DELETE /api/documents/{id}` - Soft delete documents
   - `GET /api/documents/{id}/signed-url` - Generate secure 1-hour access URLs

### Database Migration Required

⚠️ **Important**: You need to apply the SQL migration to create the documents table and storage bucket.

#### Migration File Location
```
supabase/migrations/20251030_documents_module.sql
```

#### How to Apply the Migration

**Option 1: Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click "New Query"
4. Copy and paste the entire contents of `20251030_documents_module.sql`
5. Click "Run" to execute
6. Verify success with the verification query at the end

**Option 2: Supabase CLI** (if project is linked)
```bash
npx supabase db push
```

### What the Migration Creates

1. **`documents` Table**
   - Columns: id, company_id, uploaded_by (FK to profiles), file metadata, entity links (expense_id, order_id, etc.)
   - Foreign key constraint to `profiles(id)` ensures uploaded_by references valid users
   - Indexes on company_id, uploaded_by, entity IDs, document_type, created_at
   - GIN index on tags array for fast tag searches
   - RLS policies for company-scoped access (view, insert, update, delete)

2. **Storage Bucket: `documents`**
   - Public access: false (requires signed URLs)
   - Max file size: 10MB
   - Allowed MIME types: images (jpeg, png, gif, webp), PDF, Office docs
   - File path pattern: `{company_id}/{category}/{filename}`

3. **Storage Policies**
   - Upload: Users can upload to their company folder
   - View: Users can view files in their company folder
   - Delete: Users can only delete files they uploaded

### Verification

After applying the migration, run this query to verify:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'documents'
);

-- Check FK constraint
SELECT 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'documents' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'uploaded_by';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'documents';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'documents';
```

### File Size Alignment Note

⚠️ There's a slight inconsistency to address:
- Migration sets 10MB limit
- Existing `/api/documents` accepts 50MB

**Recommendation**: Align both to 10MB (current migration setting) as:
- 10MB is sufficient for receipts, invoices, and most documents
- Prevents excessive storage usage
- Faster uploads on mobile devices

To align, update line in `src/app/api/documents/route.ts`:
```typescript
// Change from:
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// To:
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

### Testing the Feature

1. **Apply the migration** using instructions above
2. **Start the dev server**: `npm run dev`
3. **Navigate to Expenses page**: `/expenses`
4. **Click "Documents"** on any expense card
5. **Upload a test receipt**:
   - Click upload area or drag & drop
   - Select an image or PDF (< 10MB)
   - Verify upload success
6. **View the document**:
   - Click the eye icon
   - Verify image/PDF preview works
   - Test download button
7. **Delete the document**:
   - Click trash icon
   - Confirm deletion
   - Verify it's removed from list

### Build Status

✅ **Build successful** - No TypeScript or build errors

### Next Steps

Once this is working:
1. **Deliveries POD Upload** - Migrate existing POD upload to use documents table
2. **Orders Documents** - Add quote/invoice attachments to orders
3. **Project Documents** - General document management for projects

### Component Usage

The `DocumentManager` component is reusable for other entities:

```tsx
<DocumentManager
  entityType="expense"      // or "order", "delivery", "project"
  entityId={expense.id}
  documentType="receipt"    // or "pod", "invoice", "quote", "contract", "other"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Expense Receipts"
/>
```

### Files Modified

- ✅ `src/components/DocumentManager.tsx` - New component
- ✅ `src/app/expenses/page.tsx` - Added Documents button and modal
- ✅ `src/app/api/documents/[id]/signed-url/route.ts` - New endpoint
- ✅ `supabase/migrations/20251030_documents_module.sql` - Database migration

### Security Notes

- ✅ All document access is company-scoped via RLS policies
- ✅ Signed URLs expire after 1 hour for security
- ✅ Storage bucket is private (no public URLs)
- ✅ FK constraint ensures uploaded_by references valid profile
- ✅ Soft deletes preserve audit trail (deleted_at column)
- ✅ File type validation on upload (client + server)

---

**Status**: Ready for testing after migration is applied ✅
