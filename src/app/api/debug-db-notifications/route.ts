import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message 
      });
    }

    // Try to query notifications WITHOUT RLS (using service role temporarily)
    const { data: allNotifications, error: allError } = await supabase
      .from('notifications')
      .select('*')
      .limit(10);

    // Try with RLS (as current user)
    const { data: userNotifications, error: userError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .limit(10);

    // Count total notifications in table
    const { count: totalCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    // Count notifications for this user
    const { count: userCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      debug: {
        currentUser: {
          id: user.id,
          email: user.email,
        },
        counts: {
          totalInDB: totalCount,
          forCurrentUser: userCount,
        },
        queries: {
          allNotifications: {
            error: allError?.message,
            count: allNotifications?.length || 0,
            data: allNotifications || [],
          },
          userNotifications: {
            error: userError?.message,
            count: userNotifications?.length || 0,
            data: userNotifications || [],
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error),
    }, { status: 500 });
  }
}
