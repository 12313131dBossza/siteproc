import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

// GET: List documents
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const projectId = searchParams.get('project_id');
    const orderId = searchParams.get('order_id');
    const expenseId = searchParams.get('expense_id');
    const deliveryId = searchParams.get('delivery_id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        uploaded_by_profile:profiles!uploaded_by(id, full_name, email),
        project:projects(id, name, code),
        order:purchase_orders(id, po_number),
        expense:expenses(id, description),
        delivery:deliveries(id, delivery_date)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (orderId) {
      query = query.eq('order_id', orderId);
    }
    if (expenseId) {
      query = query.eq('expense_id', expenseId);
    }
    if (deliveryId) {
      query = query.eq('delivery_id', deliveryId);
    }
    if (search) {
      query = query.or(`file_name.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      documents,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string; // Comma-separated
    const projectId = formData.get('project_id') as string;
    const orderId = formData.get('order_id') as string;
    const expenseId = formData.get('expense_id') as string;
    const deliveryId = formData.get('delivery_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}-${randomString}-${sanitizedName}`;

    // Determine storage path: {company_id}/{category}/{filename}
    const categoryFolder = category || 'uncategorized';
    const storagePath = `${profile.company_id}/${categoryFolder}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Parse tags
    const tagsArray = tags
      ? tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        company_id: profile.company_id,
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_extension: fileExtension,
        storage_path: storagePath,
        storage_bucket: 'documents',
        title: title || file.name,
        description: description || null,
        category: category || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        project_id: projectId || null,
        order_id: orderId || null,
        expense_id: expenseId || null,
        delivery_id: deliveryId || null,
      })
      .select(`
        *,
        uploaded_by_profile:profiles!uploaded_by(id, full_name, email),
        project:projects(id, name, code),
        order:purchase_orders(id, po_number),
        expense:expenses(id, description),
        delivery:deliveries(id, delivery_date)
      `)
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Cleanup: Delete uploaded file if database insert fails
      await supabase.storage.from('documents').remove([storagePath]);
      
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Soft delete document
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document ID from query params
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Use soft delete function (checks permissions)
    const { data, error } = await supabase.rpc('soft_delete_document', {
      p_document_id: documentId,
    });

    if (error) {
      console.error('Soft delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Document not found or permission denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Documents DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
