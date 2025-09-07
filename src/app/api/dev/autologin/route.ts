import { sbServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabase = await sbServer();
    
    // Get or create a test user
    const testEmail = 'test@example.com';
    
    // Try to get existing user first
    const { data: userList } = await supabase.auth.admin.listUsers();
    let existingUser = userList.users.find((user: any) => user.email === testEmail);
    
    if (!existingUser) {
      // Create test user if doesn't exist
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'test123456',
        email_confirm: true
      });
      
      if (createError) {
        console.error('Failed to create test user:', createError);
        return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 });
      }
      
      existingUser = newUser.user;
    }

    if (!existingUser) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    // Generate a session for the user
    const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?redirectTo=/dashboard`
      }
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
    }

    // Redirect to the magic link URL
    return NextResponse.redirect(session.properties.action_link);

  } catch (error) {
    console.error('Autologin error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
