import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserProfile } from '@/lib/server-utils';

/**
 * GET /api/documents/[id]/signed-url
 * Generate a signed URL for secure document access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    
    // Fetch document to verify access and get storage path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('company_id', profile.company_id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Create service role client for generating signed URLs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(document.storage_path || document.file_path, 3600);

    if (urlError) {
      console.error('Signed URL generation error:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signed_url: signedUrlData.signedUrl,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_type: document.file_type,
        file_size: document.file_size
      }
    });

  } catch (error) {
    console.error('Signed URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
