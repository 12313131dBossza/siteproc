import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabase = await sbServer();
    const { email, role } = await request.json();
    
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role required' }, { status: 400 });
    }

    // Valid roles based on your schema
    const validRoles = ['viewer', 'bookkeeper', 'manager', 'admin', 'member', 'owner'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      }, { status: 400 });
    }

    // Get user by email - we'll use listUsers and filter
    const { data: userList } = await supabase.auth.admin.listUsers();
    const userData = userList.users.find((user: any) => user.email === email);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;

    // Create or update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        role: role,
        company_id: '00000000-0000-0000-0000-000000000001', // Default test company
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.error('Profile upsert error:', error);
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Role updated successfully`,
      user: { email, role },
      profile
    });

  } catch (error) {
    console.error('Set role error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    message: 'POST to this endpoint to set user roles',
    usage: 'POST { "email": "test@example.com", "role": "admin" }',
    validRoles: ['viewer', 'bookkeeper', 'manager', 'admin', 'member', 'owner']
  });
}
