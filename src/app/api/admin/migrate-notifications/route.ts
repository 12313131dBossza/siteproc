import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create notifications table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create notifications table
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN (
                'order_approved',
                'order_rejected',
                'expense_approved',
                'expense_rejected',
                'delivery_status',
                'payment_created',
                'payment_updated',
                'project_update',
                'system'
            )),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            read BOOLEAN DEFAULT FALSE,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            read_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT valid_link CHECK (link IS NULL OR link ~ '^/.*')
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

        -- Enable RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
      `
    });

    if (tableError) {
      console.error('Table creation error:', tableError);
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Notifications table created successfully' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Failed to run migration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
