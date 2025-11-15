import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName, companyId, role, invitationId, metadata } = body;

    if (!userId || !email || !fullName || !companyId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use server-side Supabase client with service role privileges
    const supabase = await sbServer();

    // Create profile (bypasses RLS with service role)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        company_id: companyId,
        role: role,
        ...metadata,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: 'Failed to create profile', details: profileError }, { status: 500 });
    }

    // Update invitation status
    if (invitationId) {
      await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitationId);
    }

    return NextResponse.json({ success: true, message: 'Profile created successfully' });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
