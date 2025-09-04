import { sbServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Expenses POST: Starting request processing');
    
    const supabase = await sbServer();
    console.log('Expenses POST: Supabase client created');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Expenses POST: Auth check result:', { user: user?.id, authError: authError?.message });
    
    if (authError || !user) {
      console.log('Expenses POST: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    console.log('Expenses POST: Request body:', body);
    
    const { vendor, category, amount, notes, receipt_url } = body;

    // Validate required fields
    if (!vendor || !category || !amount || amount <= 0) {
      console.log('Expenses POST: Validation failed');
      return NextResponse.json(
        { error: 'Missing required fields: vendor, category, and amount > 0' },
        { status: 400 }
      );
    }

    // Get user profile to determine company using authenticated client
    let companyId = null;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        companyId = profile.company_id;
      }
    } catch (error) {
      console.log('Expenses POST: Profile fetch failed');
    }

    if (!companyId) {
      console.log('Expenses POST: No company_id found for user');
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Create the expense using service client to bypass RLS
    console.log('Expenses POST: Creating expense for company:', companyId);
    
    const serviceClient = createServiceClient();
    
    const expenseData = {
      company_id: companyId,
      amount: parseFloat(amount),
      spent_at: new Date().toISOString().split('T')[0], // Today's date
      memo: `${vendor} - ${category}: ${notes || 'No additional notes'}`,
      receipt_url: receipt_url || null,
      created_at: new Date().toISOString()
    };
    
    console.log('Expenses POST: Inserting expense data:', expenseData);

    const { data: expense, error: insertError } = await serviceClient
      .from('expenses')
      .insert([expenseData])
      .select('*')
      .single();

    if (insertError) {
      console.error('Expense creation error:', insertError);
      return NextResponse.json(
        { error: `Failed to create expense: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Expenses POST: Success');
    
    // Return in expected format
    const transformedExpense = {
      id: expense.id,
      vendor: vendor,
      category: category,
      amount: expense.amount,
      status: 'approved', // Current schema treats all as approved
      created_at: expense.created_at,
      notes: notes,
      receipt_url: expense.receipt_url
    };
    
    return NextResponse.json(transformedExpense, { status: 201 });

  } catch (error) {
    console.error('Expenses API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Expenses GET: Starting request processing');
    const supabase = await sbServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Expenses GET: Auth check result:', { user: user?.id, authError: authError?.message });
    
    if (authError || !user) {
      console.log('Expenses GET: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check company
    console.log('Expenses GET: Checking user profile');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    console.log('Expenses GET: Profile check result:', { profile, profileError: profileError?.message });

    const userRole = profile?.role || 'member';
    const companyId = profile?.company_id;
    
    if (!companyId) {
      console.log('Expenses GET: No company_id found for user');
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    console.log('Expenses GET: Query parameters:', { search });

    // Query expenses using service client to bypass RLS
    console.log('Expenses GET: Querying expenses with service client');
    const serviceClient = createServiceClient();
    
    let query = serviceClient
      .from('expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Apply search filter on memo field
    if (search) {
      query = query.ilike('memo', `%${search}%`);
    }

    const { data: expenses, error: queryError } = await query;
    
    if (queryError) {
      console.error('Expenses GET: Query failed:', queryError);
      return NextResponse.json(
        { error: `Failed to fetch expenses: ${queryError.message}` },
        { status: 500 }
      );
    }

    console.log('Expenses GET: Success, found:', expenses?.length || 0);

    // Transform the data from current schema to expected format
    const transformedExpenses = (expenses || []).map((expense: any) => {
      // Parse memo field to extract vendor and category
      const memo = expense.memo || '';
      const parts = memo.split(' - ');
      const vendor = parts[0] || 'Unknown Vendor';
      
      let category = 'other';
      const categoryPart = parts[1]?.toLowerCase() || '';
      if (categoryPart.includes('labor')) category = 'labor';
      else if (categoryPart.includes('materials')) category = 'materials';
      else if (categoryPart.includes('rentals')) category = 'rentals';
      
      const notes = memo.split(': ')[1] || memo || '';

      return {
        id: expense.id,
        vendor: vendor,
        category: category,
        amount: expense.amount,
        status: 'approved', // Current schema doesn't have approval workflow
        created_at: expense.created_at,
        notes: notes,
        receipt_url: expense.receipt_url
      };
    });

    console.log('Expenses GET: Transformed expenses:', transformedExpenses.length);

    return NextResponse.json({
      expenses: transformedExpenses,
      userRole
    });

  } catch (error) {
    console.error('Expenses GET API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
