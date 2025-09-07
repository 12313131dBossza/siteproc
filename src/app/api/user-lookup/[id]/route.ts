import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }
    
    const supabase = createServiceClient();
    
    // Get user from auth system
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('Auth lookup error:', error);
      return NextResponse.json({ error: 'User lookup failed' }, { status: 500 });
    }
    
    if (!user?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Also get profile data if available
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, company_id, companies(name)')
      .eq('id', userId)
      .single();
    
    // Get company name if available
    let companyName = null;
    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', profile.company_id)
        .single();
      
      companyName = company?.name || null;
    }
    
    const response = {
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at,
      email_confirmed_at: user.user.email_confirmed_at,
      last_sign_in_at: user.user.last_sign_in_at,
      profile: profile ? {
        full_name: profile.full_name,
        role: profile.role,
        company_id: profile.company_id,
        company_name: companyName
      } : null
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('User lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
