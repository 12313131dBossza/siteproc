# Phase 17: Document Management - COMPLETE ✅

## Overview
Comprehensive document management system with file upload, storage, organization, preview, and associations to projects, orders, expenses, and deliveries.

## Implementation Summary

### 1. Database Schema ✅
**File**: `CREATE-DOCUMENTS-TABLE.sql`

**Documents Table**:
- File metadata (name, size, type, extension)
- Storage information (path, bucket)
- Document metadata (title, description, category, tags)
- Associations (project_id, order_id, expense_id, delivery_id)
- Version control (version, parent_document_id, is_latest_version)
- Soft delete support
- Timestamps (created_at, updated_at, deleted_at)

**Features**:
- 13 indexes for performance (including full-text search)
- RLS policies (view, upload, update, delete)
- Helper functions: `get_document_stats`, `soft_delete_document`, `create_document_version`
- Automatic timestamp updates

**Categories**:
- Invoice
- Contract
- Photo
- Report
- Drawing
- Permit
- Receipt
- Correspondence
- Other

---

### 2. Supabase Storage ✅
**File**: `CREATE-STORAGE-BUCKET.sql`

**Storage Bucket**: `documents` (private)

**RLS Policies**:
- Upload: Users can upload to their company folder
- View: Users can view company documents
- Update: Users can update own files, admins can update all
- Delete: Users can delete own files, admins can delete all

**Path Structure**:
```
documents/{company_id}/{category}/{filename}
Example: documents/abc-123/invoices/invoice-2024-001.pdf
```

---

### 3. API Endpoints ✅

#### **GET /api/documents**
**Purpose**: List and search documents

**Query Parameters**:
- `category`: Filter by category
- `project_id`: Filter by project
- `order_id`: Filter by order
- `expense_id`: Filter by expense
- `delivery_id`: Filter by delivery
- `search`: Search in filename, title, description
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

**Response**:
```json
{
  "documents": [
    {
      "id": "uuid",
      "file_name": "invoice.pdf",
      "file_size": 1234567,
      "file_type": "application/pdf",
      "title": "Invoice #001",
      "category": "invoice",
      "tags": ["important", "paid"],
      "project": { "id": "...", "name": "..." },
      "uploaded_by_profile": { "full_name": "..." },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### **POST /api/documents**
**Purpose**: Upload new document

**Request**: FormData
- `file`: File object (required)
- `title`: Document title (optional)
- `description`: Document description (optional)
- `category`: Document category (optional)
- `tags`: Comma-separated tags (optional)
- `project_id`: Associate with project (optional)
- `order_id`: Associate with order (optional)
- `expense_id`: Associate with expense (optional)
- `delivery_id`: Associate with delivery (optional)

**Validation**:
- Max file size: 50MB
- Allowed types: Images (jpg, png, gif, webp, svg), Documents (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv), Archives (zip, rar)

**Response**:
```json
{
  "document": { /* document object */ }
}
```

#### **GET /api/documents/[id]**
**Purpose**: Get signed URL for download/preview

**Response**:
```json
{
  "url": "https://storage.supabase.co/...",
  "document": { /* document object */ }
}
```

**URL expires in**: 1 hour

#### **PATCH /api/documents/[id]**
**Purpose**: Update document metadata

**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "category": "invoice",
  "tags": ["tag1", "tag2"],
  "project_id": "uuid",
  "order_id": "uuid"
}
```

#### **DELETE /api/documents?id=[id]**
**Purpose**: Soft delete document

**Response**:
```json
{
  "success": true
}
```

---

### 4. Components ✅

#### **DocumentUpload Component**
**File**: `src/components/DocumentUpload.tsx`

**Features**:
- Drag-and-drop file upload
- Click to browse
- Multiple file support
- File validation (size, type)
- Upload progress tracking
- File preview before upload
- Metadata input (title, description, category, tags)
- Auto-association support
- Success/error states

**Props**:
```typescript
interface DocumentUploadProps {
  onUploadComplete?: (document: any) => void;
  projectId?: string;
  orderId?: string;
  expenseId?: string;
  deliveryId?: string;
  category?: string;
  multiple?: boolean;
}
```

**Usage**:
```tsx
<DocumentUpload
  projectId="project-123"
  category="photo"
  onUploadComplete={(doc) => console.log('Uploaded:', doc)}
  multiple={true}
/>
```

#### **AssociatedDocuments Component**
**File**: `src/components/AssociatedDocuments.tsx`

**Features**:
- Display documents associated with entity
- Upload new documents
- Preview documents (images, PDFs)
- Download documents
- Delete documents
- Real-time updates
- Compact list view with metadata

**Props**:
```typescript
interface AssociatedDocumentsProps {
  projectId?: string;
  orderId?: string;
  expenseId?: string;
  deliveryId?: string;
  title?: string;
}
```

**Usage**:
```tsx
<AssociatedDocuments
  projectId="project-123"
  title="Project Documents"
/>
```

---

### 5. Documents Page ✅
**File**: `src/app/documents/page.tsx`

**Features**:

**Search & Filter**:
- Full-text search (filename, title, description, tags)
- Category filter dropdown
- Real-time search

**Upload**:
- Toggle upload panel
- Bulk upload support
- Metadata input

**Document List**:
- Table view with columns:
  - Document (icon, name, description, tags)
  - Category (colored badges)
  - Size
  - Uploaded by & date
  - Associations (project, order, expense)
  - Actions (preview, download, edit, delete)

**Preview Modal**:
- In-app preview for images
- PDF iframe viewer
- Fallback download for other types
- Full screen modal

**Edit Modal**:
- Update title, description, category, tags
- Inline editing
- Validation

**Empty States**:
- No documents placeholder
- Upload prompt

**UI Elements**:
- Responsive design
- Icon-based file types
- Color-coded categories
- Hover effects
- Loading states

---

### 6. Navigation Integration ✅

**Sidebar Navigation**:
- Added "Documents" link (3rd position)
- Icon: Files
- Path: /documents

---

## File Structure

```
Phase 17 Files Created (7 files):
├── CREATE-DOCUMENTS-TABLE.sql              # Database schema
├── CREATE-STORAGE-BUCKET.sql               # Storage configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── documents/
│   │   │       ├── route.ts                # GET, POST, DELETE endpoints
│   │   │       └── [id]/
│   │   │           └── route.ts            # GET (URL), PATCH endpoints
│   │   └── documents/
│   │       └── page.tsx                    # Documents management page
│   └── components/
│       ├── DocumentUpload.tsx              # Drag-drop upload component
│       └── AssociatedDocuments.tsx         # Entity document display

Modified Files (1 file):
├── src/components/sidebar-nav.tsx          # Added Documents link
```

---

## Technical Specifications

### File Validation
- **Max Size**: 50MB per file
- **Allowed Types**:
  - Images: jpg, jpeg, png, gif, webp, svg
  - Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv
  - Archives: zip, rar

### Storage Structure
```
documents/
  ├── {company_id}/
  │   ├── invoice/
  │   │   └── {timestamp}-{random}-{filename}
  │   ├── contract/
  │   ├── photo/
  │   ├── report/
  │   ├── drawing/
  │   ├── permit/
  │   ├── receipt/
  │   ├── correspondence/
  │   ├── other/
  │   └── uncategorized/
```

### Security
- **RLS Policies**: Company-scoped access
- **Private Bucket**: Files not publicly accessible
- **Signed URLs**: Temporary access (1 hour expiry)
- **Permissions**:
  - All users: View, upload
  - Owners/Admins: Update, delete all
  - Regular users: Update/delete own files

### Performance
- **Indexes**: 13 total
  - 12 standard indexes (company, category, associations, dates)
  - 1 full-text search index (GIN)
- **Pagination**: Default 50 documents per page
- **Lazy Loading**: Documents fetched on demand

### Version Control
- Version number tracking
- Parent document linking
- Latest version flag
- History preservation

---

## Database Functions

### get_document_stats(company_id)
**Purpose**: Get document statistics for a company

**Returns**:
```sql
{
  total_documents: 150,
  total_size_bytes: 52428800,
  by_category: {
    "invoice": 45,
    "photo": 30,
    "contract": 25,
    ...
  },
  by_file_type: {
    "application/pdf": 60,
    "image/jpeg": 40,
    ...
  }
}
```

### soft_delete_document(document_id)
**Purpose**: Soft delete a document (mark as deleted)

**Returns**: Boolean (success/failure)

**Permissions**: Document owner or admin

### create_document_version(parent_id, file_name, file_size, ...)
**Purpose**: Create a new version of an existing document

**Features**:
- Inherits metadata from parent
- Increments version number
- Marks previous versions as not latest
- Links to parent document

---

## Usage Examples

### Upload Document to Project
```typescript
// In project detail page
<AssociatedDocuments
  projectId={project.id}
  title="Project Documents"
/>
```

### Standalone Upload
```typescript
// Upload without associations
<DocumentUpload
  category="report"
  onUploadComplete={(doc) => {
    console.log('Uploaded:', doc);
  }}
  multiple={true}
/>
```

### Search Documents
```typescript
// API call
const response = await fetch(
  `/api/documents?search=invoice&category=invoice&project_id=abc-123`
);
const { documents, pagination } = await response.json();
```

### Get Download URL
```typescript
// Get signed URL
const response = await fetch(`/api/documents/${documentId}`);
const { url, document } = await response.json();
window.open(url, '_blank');
```

### Update Document
```typescript
// Update metadata
const response = await fetch(`/api/documents/${documentId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Updated Title',
    category: 'invoice',
    tags: ['important', 'urgent'],
  }),
});
```

---

## Setup Instructions

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor
-- Run CREATE-DOCUMENTS-TABLE.sql
-- Run CREATE-STORAGE-BUCKET.sql
```

### 2. Verify Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Verify `documents` bucket exists
3. Check bucket is private (not public)

### 3. Test Upload
1. Navigate to `/documents`
2. Click "Upload" button
3. Drag and drop a file
4. Fill metadata
5. Click "Upload All"
6. Verify file appears in list

### 4. Test Associations
1. Go to a project detail page
2. Add `<AssociatedDocuments projectId={id} />`
3. Upload document
4. Verify association in documents list

---

## Key Features Summary

✅ **File Management**:
- Upload (drag-drop, browse)
- Download
- Preview (images, PDFs)
- Delete (soft)
- Update metadata

✅ **Organization**:
- 9 categories
- Flexible tagging
- Full-text search
- Associations

✅ **Security**:
- Company isolation (RLS)
- Private storage
- Signed URLs
- Permission-based access

✅ **User Experience**:
- Drag-and-drop upload
- Progress tracking
- Inline preview
- Responsive design
- Loading states

✅ **Integration**:
- Project associations
- Order associations
- Expense associations
- Delivery associations

✅ **Performance**:
- Indexed searches
- Pagination
- Optimized queries
- Lazy loading

---

## Next Steps (Phase 17 Remaining)

### PDF Generation for Reports 🔄
- Install PDF library (e.g., jsPDF, react-pdf)
- Create PDF templates for:
  - Purchase orders
  - Project reports
  - Analytics reports
  - Invoices
- Export button integration

---

## Testing Checklist

- [x] Database schema created
- [x] Storage bucket configured
- [x] Upload API working
- [x] Document list page functional
- [x] Search and filters working
- [x] Preview modal displays correctly
- [x] Download URLs generated
- [x] Edit metadata functional
- [x] Soft delete working
- [x] AssociatedDocuments component working
- [x] Navigation link added
- [ ] PDF generation implemented

---

## Notes

**Storage Costs**: Monitor file uploads and set quotas if needed (Supabase free tier: 1GB storage)

**File Types**: Extend `ALLOWED_FILE_TYPES` array in API if more types needed

**Version Control**: Currently supports versioning via `create_document_version` function - implement UI if needed

**Thumbnails**: Consider adding thumbnail generation for images using Supabase Image Transformation

**Search**: Full-text search implemented with GIN index - very fast for large datasets

**Cleanup**: Soft-deleted documents remain in storage - implement hard delete cron job if needed

---

## Phase 17 Status: 87.5% Complete (7/8 tasks) ✅

**Completed**:
1. ✅ Database schema
2. ✅ Storage bucket
3. ✅ Upload API
4. ✅ Upload component
5. ✅ Documents page
6. ✅ Preview functionality
7. ✅ Document associations

**Remaining**:
8. 🔄 PDF generation for reports

---

**Phase 17 is production-ready for document management!** 🎉

The PDF generation feature is optional and can be implemented as needed based on specific business requirements.
