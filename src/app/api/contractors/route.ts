import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { logActivity } from '@/app/api/activity/route';

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company_id and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 });
    }

    const { data: contractors, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Contractors fetch error (RLS):', error);
      
      // Service-role fallback for admins
      if (['admin', 'owner', 'manager'].includes(profile.role || '')) {
        console.log('🔄 Using service-role fallback for contractors');
        
        const serviceSb = createServiceClient();
        const { data: fallbackContractors, error: fallbackError } = await serviceSb
          .from('contractors')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.error('Service-role fallback failed:', fallbackError);
          return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
        }
        
        return NextResponse.json(fallbackContractors || []);
      }
      
      return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
    }

    return NextResponse.json(contractors || []);
  } catch (error: any) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contractors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company_id and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 });
    }

    const contractorData = {
      name: body.name,
      company_name: body.company_name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      specialty: body.specialty,
      status: body.status || 'active',
      notes: body.notes,
      company_id: profile.company_id,
      created_by: user.id
    };

    let contractor;
    let error;

    // Try with normal RLS
    const result = await supabase
      .from('contractors')
      .insert([contractorData])
      .select()
      .single();

    contractor = result.data;
    error = result.error;

    // Service-role fallback
    if (error && ['admin', 'owner', 'manager'].includes(profile.role || '')) {
      console.log('🔄 Using service-role fallback for contractor creation');
      
      const serviceSb = createServiceClient();
      const fallbackResult = await serviceSb
        .from('contractors')
        .insert([contractorData])
        .select()
        .single();
      
      contractor = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('Error creating contractor:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create contractor' },
        { status: 500 }
      );
    }

    // Log activity
    await logActivity({
      type: 'contractor',
      action: 'created',
      title: `Contractor "${contractor.name}" created`,
      description: `Created new contractor: ${contractor.company_name || contractor.name}`,
      entity_type: 'contractor',
      entity_id: contractor.id,
      metadata: {
        contractor_name: contractor.name,
        company_name: contractor.company_name,
        email: contractor.email,
        specialty: contractor.specialty,
        status: contractor.status,
      },
      user_id: user.id,
      company_id: profile.company_id,
    })

    return NextResponse.json(contractor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contractor' },
      { status: 500 }
    );
  }
}
