import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Get signed URL for document download/preview
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const documentId = params.id;

    // Get document from database (RLS will check permissions)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get signed URL for file (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, 3600); // 1 hour

    if (urlError) {
      console.error('Signed URL error:', urlError);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      document,
    });
  } catch (error: any) {
    console.error('Document URL error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    const documentId = params.id;
    const body = await request.json();
    const { title, description, category, tags, project_id, order_id, expense_id, delivery_id } = body;

    // Parse tags if provided
    const tagsArray = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()))
      : undefined;

    // Update document (RLS will check permissions)
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        title: title || undefined,
        description: description || undefined,
        category: category || undefined,
        tags: tagsArray || undefined,
        project_id: project_id || undefined,
        order_id: order_id || undefined,
        expense_id: expense_id || undefined,
        delivery_id: delivery_id || undefined,
      })
      .eq('id', documentId)
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .select(`
        *,
        uploaded_by_profile:profiles!documents_uploaded_by_fkey(id, full_name, email),
        project:projects(id, name, code),
        order:purchase_orders(id, po_number),
        expense:expenses(id, description),
        delivery:deliveries(id, delivery_date)
      `)
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found or permission denied' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Document PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
