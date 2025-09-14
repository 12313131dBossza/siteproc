import { NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await sbServer();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ 
        authenticated: false,
        error: error?.message || 'No user session'
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Session check failed'
    });
  }
}