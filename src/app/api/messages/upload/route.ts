import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST - Upload file attachment for message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      // Audio types for voice messages
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
      'audio/aac',
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error('File type not allowed:', file.type);
      return NextResponse.json({ 
        error: `File type not allowed: ${file.type}. Allowed: images, PDF, Word, Excel, text, audio files` 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `messages/${projectId}/${user.id}/${timestamp}_${safeName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('attachments')
      .getPublicUrl(filePath);

    // Determine file type category
    let fileCategory = 'file';
    if (file.type.startsWith('image/')) {
      fileCategory = 'image';
    } else if (file.type === 'application/pdf') {
      fileCategory = 'pdf';
    } else if (file.type.includes('word')) {
      fileCategory = 'document';
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      fileCategory = 'spreadsheet';
    }

    return NextResponse.json({
      success: true,
      attachment: {
        url: publicUrl,
        name: file.name,
        type: file.type,
        category: fileCategory,
        size: file.size,
        path: filePath,
      }
    });
  } catch (error) {
    console.error('Error in upload POST:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
