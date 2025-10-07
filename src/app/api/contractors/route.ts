import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    
    const { data: contractors, error } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

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

    const { data: contractor, error } = await supabase
      .from('contractors')
      .insert([{
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
        notes: body.notes
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(contractor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contractor' },
      { status: 500 }
    );
  }
}
