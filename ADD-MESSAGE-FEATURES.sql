-- ADD-MESSAGE-FEATURES.sql
-- Enhanced messaging features: reactions, pins, bookmarks, editing, typing indicators
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- 1. Add new columns to project_messages
-- ============================================

-- Edited tracking
ALTER TABLE public.project_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Pinned messages
ALTER TABLE public.project_messages 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- Message type (text, file, image, voice, system)
ALTER TABLE public.project_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Mentions (array of user IDs mentioned)
ALTER TABLE public.project_messages 
ADD COLUMN IF NOT EXISTS mentions UUID[];

-- ============================================
-- 2. Message Reactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.project_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- '👍', '❤️', '😂', '😮', '😢', '🎉'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one reaction type per user per message
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- RLS for reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_messages pm
      WHERE pm.id = message_reactions.message_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = pm.company_id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.project_members pmem
          WHERE pmem.user_id = auth.uid()
          AND pmem.project_id = pm.project_id
          AND pmem.status = 'active'
        )
      )
    )
  );

CREATE POLICY "reactions_insert" ON public.message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_messages pm
      WHERE pm.id = message_reactions.message_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = pm.company_id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.project_members pmem
          WHERE pmem.user_id = auth.uid()
          AND pmem.project_id = pm.project_id
          AND pmem.status = 'active'
        )
      )
    )
  );

CREATE POLICY "reactions_delete" ON public.message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 3. Message Bookmarks Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.project_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT, -- Optional note about why bookmarked
  
  -- One bookmark per user per message
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_bookmarks_user_id ON public.message_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_message_bookmarks_message_id ON public.message_bookmarks(message_id);

-- RLS for bookmarks
ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_all" ON public.message_bookmarks
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 4. Typing Indicators Table (ephemeral)
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One indicator per user per project/channel
  UNIQUE(project_id, channel, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_project_channel ON public.typing_indicators(project_id, channel);

-- RLS for typing indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "typing_select" ON public.typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.projects proj ON proj.company_id = p.company_id
      WHERE p.id = auth.uid()
      AND proj.id = typing_indicators.project_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id = typing_indicators.project_id
      AND pm.status = 'active'
    )
  );

CREATE POLICY "typing_insert" ON public.typing_indicators
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "typing_update" ON public.typing_indicators
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "typing_delete" ON public.typing_indicators
  FOR DELETE USING (user_id = auth.uid());

-- Auto-delete old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_typing_trigger ON public.typing_indicators;
CREATE TRIGGER cleanup_typing_trigger
  AFTER INSERT ON public.typing_indicators
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_typing_indicators();

-- ============================================
-- 5. Message Read Receipts (per user)
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.project_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- RLS for read receipts
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_receipts_select" ON public.message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_messages pm
      WHERE pm.id = message_read_receipts.message_id
      AND (
        pm.sender_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = pm.company_id
        )
        OR EXISTS (
          SELECT 1 FROM public.project_members pmem
          WHERE pmem.user_id = auth.uid()
          AND pmem.project_id = pm.project_id
          AND pmem.status = 'active'
        )
      )
    )
  );

CREATE POLICY "read_receipts_insert" ON public.message_read_receipts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. Enable Realtime on new tables
-- ============================================
-- Note: Only add tables that aren't already in the publication
DO $$
BEGIN
  -- Try to add project_messages (may already exist)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_messages;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'project_messages already in publication';
  END;
  
  -- Try to add message_reactions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'message_reactions already in publication';
  END;
  
  -- Try to add typing_indicators
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'typing_indicators already in publication';
  END;
END $$;

-- ============================================
-- 7. Indexes for search
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_messages_message_search 
ON public.project_messages USING gin(to_tsvector('english', message));

-- ============================================
-- Verify
-- ============================================
SELECT 'New columns added to project_messages:';
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'project_messages'
AND column_name IN ('edited_at', 'is_edited', 'is_pinned', 'pinned_at', 'pinned_by', 'message_type', 'mentions');

SELECT 'New tables created:';
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('message_reactions', 'message_bookmarks', 'typing_indicators', 'message_read_receipts');

COMMIT;
