import { sbServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { sendExpenseNotifications } from '@/lib/notifications';
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

    // Get user profile to determine role and company
    let companyId = null;
    let userRole = 'viewer';
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        companyId = profile.company_id;
      }
      if (profile?.role) {
        userRole = profile.role;
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

    // Check permissions - viewers cannot create expenses
    if (userRole === 'viewer') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Viewers cannot create expenses.' },
        { status: 403 }
      );
    }

    // Create the expense using service client to bypass RLS
    console.log('Expenses POST: Creating expense for company:', companyId);
    
    const serviceClient = createServiceClient();
    
    // Determine initial status based on role
    const initialStatus = (userRole === 'admin' || userRole === 'owner' || userRole === 'bookkeeper') 
      ? 'approved'  // Admins can create pre-approved expenses
      : 'pending';  // Members create pending expenses
    
    const expenseData = {
      company_id: companyId,
      user_id: user.id,
      amount: parseFloat(amount),
      spent_at: new Date().toISOString().split('T')[0],
      memo: `${vendor} - ${category}: ${notes || 'No additional notes'}`,
      receipt_url: receipt_url || null,
      status: initialStatus,
      approved_by: initialStatus === 'approved' ? user.id : null,
      approved_at: initialStatus === 'approved' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
    
    // Send email notification for new expense
    try {
      await sendExpenseNotifications(expense.id, 'created');
      console.log('Expense notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send expense notification:', emailError);
      // Don't fail the request if email fails
    }
    
    // Return in expected format with proper status
    const transformedExpense = {
      id: expense.id,
      vendor: vendor,
      category: category,
      amount: expense.amount,
      status: expense.status,
      created_at: expense.created_at,
      notes: notes,
      receipt_url: expense.receipt_url,
      user_id: expense.user_id,
      approved_by: expense.approved_by,
      approved_at: expense.approved_at
    };
    
    const statusMessage = initialStatus === 'approved' 
      ? 'Expense created and automatically approved!'
      : 'Expense submitted for approval!';
    
    console.log('Expenses POST: Success with status:', initialStatus);
    return NextResponse.json({
      ...transformedExpense,
      message: statusMessage
    }, { status: 201 });

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

    // Get user profile to check role and company
    console.log('Expenses GET: Checking user profile');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    console.log('Expenses GET: Profile check result:', { profile, profileError: profileError?.message });

    const userRole = profile?.role || 'viewer';
    const companyId = profile?.company_id;
    const isAdmin = userRole === 'admin' || userRole === 'owner' || userRole === 'bookkeeper';
    
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
    const status = searchParams.get('status');
    const showAll = searchParams.get('showAll') === 'true';

    console.log('Expenses GET: Query parameters:', { search, status, showAll, userRole });

    // Query expenses using service client to bypass RLS
    console.log('Expenses GET: Querying expenses with service client');
    const serviceClient = createServiceClient();
    
    let query = serviceClient
      .from('expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (userRole === 'viewer') {
      // Viewers can only see approved expenses
      query = query.eq('status', 'approved');
    } else if (userRole === 'member' && !isAdmin && !showAll) {
      // Members can only see their own expenses (unless admin viewing all)
      query = query.eq('user_id', user.id);
    }
    // Admins can see all expenses in their company (no additional filter)

    // Apply status filter if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

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

    // Transform the data to expected format
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
        status: expense.status || 'approved', // Default to approved for backward compatibility
        created_at: expense.created_at,
        notes: notes,
        receipt_url: expense.receipt_url,
        user_id: expense.user_id,
        approved_by: expense.approved_by,
        approved_at: expense.approved_at,
  approval_notes: expense.approval_notes,
  project_id: expense.project_id || null
      };
    });

    console.log('Expenses GET: Transformed expenses:', transformedExpenses.length);

    return NextResponse.json({
      expenses: transformedExpenses,
      userRole,
      isAdmin
    });

  } catch (error) {
    console.error('Expenses GET API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
