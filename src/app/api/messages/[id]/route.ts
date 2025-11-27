import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// PATCH - Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Check ownership
    const { data: existingMessage } = await adminClient
      .from('project_messages')
      .select('sender_id')
      .eq('id', id)
      .single();

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existingMessage.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }

    // Update message
    const { data: updated, error: updateError } = await adminClient
      .from('project_messages')
      .update({
        message: message.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('Error in message PATCH:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
}

// DELETE - Soft delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: existingMessage } = await adminClient
      .from('project_messages')
      .select('sender_id')
      .eq('id', id)
      .single();

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existingMessage.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Soft delete
    const { error: deleteError } = await adminClient
      .from('project_messages')
      .update({
        deleted_at: new Date().toISOString(),
        message: '[This message was deleted]',
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in message DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
