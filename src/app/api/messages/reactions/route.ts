import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET reactions for a message
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');

    if (!messageId) {
      return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
    }

    const { data: reactions, error } = await adminClient
      .from('message_reactions')
      .select(`
        id,
        emoji,
        user_id,
        created_at
      `)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching reactions:', error);
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    // Group by emoji
    const grouped: Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }> = {};
    
    (reactions || []).forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasReacted: false };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user_id);
      if (r.user_id === user.id) {
        grouped[r.emoji].hasReacted = true;
      }
    });

    return NextResponse.json({ reactions: Object.values(grouped) });
  } catch (error) {
    console.error('Error in reactions GET:', error);
    return NextResponse.json({ error: 'Failed to load reactions' }, { status: 500 });
  }
}

// POST - Add a reaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message_id, emoji } = body;

    if (!message_id || !emoji) {
      return NextResponse.json({ error: 'Missing message_id or emoji' }, { status: 400 });
    }

    // Validate emoji
    const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥', '✅', '❌'];
    if (!allowedEmojis.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Check if already reacted with this emoji
    const { data: existing } = await adminClient
      .from('message_reactions')
      .select('id')
      .eq('message_id', message_id)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction (toggle off)
      await adminClient
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ action: 'removed', emoji });
    }

    // Add reaction
    const { data: reaction, error: insertError } = await adminClient
      .from('message_reactions')
      .insert({
        message_id,
        user_id: user.id,
        emoji,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding reaction:', insertError);
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
    }

    return NextResponse.json({ action: 'added', reaction });
  } catch (error) {
    console.error('Error in reactions POST:', error);
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}

// DELETE - Remove a reaction
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');
    const emoji = searchParams.get('emoji');

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Missing message_id or emoji' }, { status: 400 });
    }

    const { error } = await adminClient
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in reactions DELETE:', error);
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  }
}
