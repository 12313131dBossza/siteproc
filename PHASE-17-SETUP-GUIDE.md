# Phase 17: Document Management - Setup Guide

## Prerequisites
- Supabase project set up
- Database access (SQL Editor)
- Storage access enabled

---

## Step 1: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to your project: https://app.supabase.com/project/[your-project-id]

2. **Navigate to SQL Editor**
   - Left sidebar → SQL Editor

3. **Run Documents Table Migration**
   - Copy contents of `CREATE-DOCUMENTS-TABLE.sql`
   - Paste in SQL Editor
   - Click "Run" or press Ctrl/Cmd + Enter
   - Verify: Should see success messages at bottom

4. **Run Storage Bucket Migration**
   - Copy contents of `CREATE-STORAGE-BUCKET.sql`
   - Paste in SQL Editor
   - Click "Run"
   - Verify: Check for success messages

---

## Step 2: Verify Database Setup

### Check Table Exists
```sql
SELECT * FROM documents LIMIT 1;
```
Should return empty result (no error)

### Check Indexes
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'documents';
```
Should return 13 indexes

### Check RLS Policies
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'documents';
```
Should return 4 policies:
- Users can view company documents
- Users can upload documents
- Users can update own documents
- Users can delete own documents

### Check Helper Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_document_stats', 'soft_delete_document', 'create_document_version');
```
Should return 3 functions

---

## Step 3: Verify Storage Bucket

1. **Navigate to Storage**
   - Left sidebar → Storage

2. **Check Documents Bucket**
   - Should see `documents` bucket
   - Verify it's marked as **Private** (not public)

3. **Check Storage Policies**
   - Click on `documents` bucket
   - Click "Policies" tab
   - Should see 4 policies (upload, view, update, delete)

---

## Step 4: Deploy Code

Code has already been pushed to GitHub and should auto-deploy to Vercel.

**Check Deployment Status**:
1. Go to Vercel Dashboard
2. Check latest deployment
3. Wait for "Ready" status

---

## Step 5: Test in Application

### Test 1: Navigate to Documents Page
1. Open application in browser
2. Click "Documents" in sidebar (3rd position)
3. Should see documents page with "Upload" button

### Test 2: Upload a Document
1. Click "Upload" button
2. Drag and drop a file (or click to browse)
3. Fill in metadata:
   - Title: "Test Document"
   - Category: "Report"
   - Description: "Testing upload"
   - Tags: "test, demo"
4. Click "Upload All"
5. Verify:
   - Progress bar appears
   - Success checkmark shows
   - Document appears in list

### Test 3: Preview Document
1. Click eye icon (👁️) on uploaded document
2. Modal should open
3. For images: Should display image
4. For PDFs: Should display in iframe
5. Close modal with X button

### Test 4: Download Document
1. Click download icon on document
2. Should open in new tab or download

### Test 5: Edit Document
1. Click edit icon (✏️)
2. Update metadata
3. Click "Save Changes"
4. Verify changes appear in list

### Test 6: Search & Filter
1. Type in search box
2. Press Enter or click Search
3. Verify results match search term
4. Select category from dropdown
5. Verify filtered results

### Test 7: Delete Document
1. Click delete icon (🗑️)
2. Confirm deletion
3. Verify document removed from list

---

## Step 6: Test Document Associations (Optional)

To test document associations with projects/orders/expenses, you'll need to integrate the `AssociatedDocuments` component into those pages.

### Example: Add to Project Detail Page

**File**: `src/app/projects/[id]/page.tsx`

Add after project details:
```tsx
import AssociatedDocuments from '@/components/AssociatedDocuments';

// Inside component
<AssociatedDocuments
  projectId={project.id}
  title="Project Documents"
/>
```

Then test:
1. Navigate to a project detail page
2. Click "Upload" in documents section
3. Upload a file
4. Go to `/documents` page
5. Verify document shows project association

---

## Troubleshooting

### Issue: Upload fails with "Unauthorized"
**Solution**: 
- Check RLS policies are created
- Verify user is logged in
- Check user has company_id in profiles table

### Issue: Preview shows "Failed to load"
**Solution**:
- Check storage bucket policies
- Verify signed URL is being generated
- Check browser console for CORS errors

### Issue: Documents not appearing in list
**Solution**:
- Check RLS policies
- Verify company_id matches
- Check deleted_at is NULL

### Issue: Storage bucket not found
**Solution**:
- Re-run CREATE-STORAGE-BUCKET.sql
- Manually create bucket:
  1. Storage → New bucket
  2. Name: `documents`
  3. Public: Off
  4. Then add RLS policies

### Issue: File size limit exceeded
**Solution**:
- Default limit is 50MB
- To change: Update `MAX_FILE_SIZE` in `/api/documents/route.ts`
- Note: Supabase free tier has storage limits

---

## Configuration Options

### Change Max File Size
**File**: `src/app/api/documents/route.ts`
```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
```

### Add Allowed File Types
**File**: `src/app/api/documents/route.ts`
```typescript
const ALLOWED_FILE_TYPES = [
  // ... existing types
  'application/json',
  'video/mp4',
];
```

### Add Custom Categories
**File**: `CREATE-DOCUMENTS-TABLE.sql`
```sql
category TEXT CHECK (category IN (
    -- ... existing categories
    'custom_category'
)),
```
Then re-run migration

---

## Performance Tips

1. **Enable Full-Text Search Index** (already created)
   - GIN index on searchable fields
   - Fast searching across millions of documents

2. **Pagination**
   - Default: 50 documents per page
   - Adjust in API: `const limit = parseInt(searchParams.get('limit') || '100');`

3. **Storage Optimization**
   - Consider image compression before upload
   - Use Supabase Image Transformation for thumbnails
   - Implement lazy loading for large lists

4. **Caching**
   - Signed URLs valid for 1 hour
   - Cache in client to avoid regenerating
   - Consider CDN for frequently accessed files

---

## Security Checklist

- [x] RLS enabled on documents table
- [x] RLS enabled on storage.objects
- [x] Private storage bucket (not public)
- [x] Company-scoped access control
- [x] Signed URLs with expiry
- [x] File type validation
- [x] File size limits
- [x] Soft delete (preserve history)
- [x] Permission-based editing

---

## Next Steps

### Optional Enhancements:

1. **PDF Generation** (Phase 17 Task 8)
   - Install library: `npm install jspdf`
   - Create PDF templates
   - Add export buttons

2. **Thumbnail Generation**
   - Use Supabase Image Transformation
   - Generate on upload
   - Display in list view

3. **Version Control UI**
   - Show version history
   - Compare versions
   - Restore previous versions

4. **Bulk Operations**
   - Select multiple documents
   - Bulk download (as zip)
   - Bulk delete
   - Bulk categorize

5. **Advanced Search**
   - Filter by date range
   - Filter by file type
   - Filter by uploader
   - Combine multiple filters

6. **File Sharing**
   - Generate shareable links
   - Set expiry on shares
   - Password protect
   - Track views

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'documents'`
4. Check storage policies in Supabase Dashboard

---

## Summary

✅ **Database**: Documents table with 13 indexes, 4 RLS policies, 3 helper functions

✅ **Storage**: Private bucket with company-scoped access

✅ **API**: 5 endpoints (list, upload, get URL, update, delete)

✅ **UI**: Documents page, upload component, associations component

✅ **Features**: Search, filter, preview, edit, delete, associations

✅ **Security**: RLS, signed URLs, permissions, validation

✅ **Performance**: Indexed, paginated, optimized queries

---

**Phase 17 is ready to use!** 🎉

Navigate to `/documents` and start uploading files.
