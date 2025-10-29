# STORAGE BUCKET SETUP GUIDE

## ⚠️ Important: Storage Policies MUST Be Created via Dashboard UI

You cannot create storage bucket policies via SQL because of permission restrictions on the `storage.objects` table. Follow these steps instead:

---

## Step-by-Step Setup

### 1️⃣ Create Storage Bucket

1. **Go to Supabase Dashboard**
   - Navigate to: https://app.supabase.com/project/[your-project-id]

2. **Open Storage**
   - Click "Storage" in the left sidebar

3. **Create New Bucket**
   - Click "New bucket" button
   - **Bucket name**: `documents`
   - **Public bucket**: Toggle OFF (keep it private)
   - Click "Create bucket"

✅ **Bucket created!**

---

### 2️⃣ Create RLS Policies (4 total)

1. **Click on the "documents" bucket**
2. **Go to "Policies" tab**
3. **Enable RLS** (if not already enabled)
4. **Create each policy below**

---

#### Policy 1: Upload (INSERT)

**Click "New Policy" → "Create a policy from scratch"**

- **Policy name**: `Users can upload documents to their company folder`
- **Allowed operation**: Check ✅ `INSERT`
- **Target roles**: `authenticated`
- **USING expression** (leave empty for INSERT)
- **WITH CHECK expression**:

```sql
bucket_id = 'documents'
AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM profiles 
    WHERE id = auth.uid()
)
```

Click "Review" → "Save policy"

---

#### Policy 2: View (SELECT)

**Click "New Policy" → "Create a policy from scratch"**

- **Policy name**: `Users can view documents from their company`
- **Allowed operation**: Check ✅ `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'documents'
AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM profiles 
    WHERE id = auth.uid()
)
```

- **WITH CHECK expression**: (leave empty)

Click "Review" → "Save policy"

---

#### Policy 3: Update (UPDATE)

**Click "New Policy" → "Create a policy from scratch"**

- **Policy name**: `Users can update documents they uploaded`
- **Allowed operation**: Check ✅ `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'documents'
AND (
    owner = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND company_id::text = (storage.foldername(name))[1]
    )
)
```

- **WITH CHECK expression**: (same as USING)

Click "Review" → "Save policy"

---

#### Policy 4: Delete (DELETE)

**Click "New Policy" → "Create a policy from scratch"**

- **Policy name**: `Users can delete documents they uploaded`
- **Allowed operation**: Check ✅ `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'documents'
AND (
    owner = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND company_id::text = (storage.foldername(name))[1]
    )
)
```

- **WITH CHECK expression**: (leave empty for DELETE)

Click "Review" → "Save policy"

---

### 3️⃣ Verify Setup

Run this SQL in Supabase SQL Editor to verify:

```sql
-- Check bucket exists
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'documents';

-- Expected result:
-- id: documents
-- name: documents
-- public: false
-- created_at: [timestamp]

-- Check policies exist (should return 4 rows)
SELECT 
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%'
ORDER BY policyname;

-- Expected result (4 policies):
-- 1. Users can delete documents they uploaded | DELETE
-- 2. Users can update documents they uploaded | UPDATE  
-- 3. Users can upload documents to their company folder | INSERT
-- 4. Users can view documents from their company | SELECT
```

---

## ✅ Setup Complete!

You should now have:

- ✅ `documents` bucket (private)
- ✅ 4 RLS policies (INSERT, SELECT, UPDATE, DELETE)
- ✅ Company-scoped access control
- ✅ Admin override permissions

---

## Storage Path Structure

Files will be organized as:

```
documents/
  └── {company_id}/
      ├── invoice/
      │   └── {timestamp}-{random}-filename.pdf
      ├── photo/
      │   └── {timestamp}-{random}-photo.jpg
      ├── contract/
      ├── report/
      ├── drawing/
      ├── permit/
      ├── receipt/
      ├── correspondence/
      └── other/
```

**Example**:
```
documents/123e4567-e89b-12d3-a456-426614174000/invoice/1704123456-abc123-invoice-001.pdf
```

This ensures:
- ✅ Company isolation via RLS policies
- ✅ Organized by category
- ✅ Unique filenames (no conflicts)
- ✅ Easy cleanup when deleting a company

---

## Testing

1. **Navigate to** `/documents` in your app
2. **Click** "Upload" button
3. **Drag and drop** a test file
4. **Fill metadata** and click "Upload All"
5. **Verify** file appears in Storage bucket

**Check in Supabase**:
- Dashboard → Storage → documents bucket
- Should see: `{company_id}/{category}/{filename}`

---

## Troubleshooting

### Error: "new row violates row-level security policy"

**Solution**: Check that:
1. User is authenticated
2. User has `company_id` in profiles table
3. Policies are created correctly
4. Bucket name is exactly `documents`

### Error: "Failed to upload file"

**Solution**:
1. Check browser console for detailed error
2. Verify RLS policies exist
3. Check file size (max 50MB by default)
4. Verify file type is allowed

### Files not visible in list

**Solution**:
1. Check Storage → documents bucket in Supabase
2. Verify `company_id` folder exists
3. Check RLS policies for SELECT operation
4. Ensure `deleted_at` is NULL in documents table

---

## Security Notes

🔒 **Private Bucket**: Files are NOT publicly accessible

🔒 **Company Isolation**: Users can only access their company's files

🔒 **Signed URLs**: Temporary access (1 hour expiry)

🔒 **Admin Override**: Owners and admins can manage all company files

🔒 **RLS Enforced**: Policies check on every operation

---

## Next Steps

After setup is complete:

1. ✅ Test file upload via `/documents` page
2. ✅ Test preview/download functionality
3. ✅ Verify policies with different user roles
4. ✅ Monitor storage usage in Dashboard

---

**Setup should take ~5 minutes** ⏱️

If you encounter issues, verify each policy was created exactly as shown above.
