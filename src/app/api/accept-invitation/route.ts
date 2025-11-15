import { sbAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName, companyId, role, invitationId, metadata } = body;

    if (!userId || !email || !fullName || !companyId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use admin client with service role (bypasses RLS)
    const supabase = sbAdmin();

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
      console.error('Error details:', JSON.stringify(profileError, null, 2));
      console.error('Attempted to create profile with:', { userId, email, fullName, companyId, role });
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: profileError,
        message: profileError.message || 'Unknown database error',
        code: profileError.code || 'UNKNOWN'
      }, { status: 500 });
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
