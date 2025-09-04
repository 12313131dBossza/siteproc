import { sbServer } from '@/lib/supabase-server';
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

    // Get user profile to determine role
    let userRole = 'member'; // default
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role) {
        userRole = profile.role;
      }
    } catch (error) {
      console.log('Expenses POST: Profile fetch failed, using default role');
    }

    // Create the expense - try different column combinations for compatibility
    console.log('Expenses POST: Creating expense');
    
    // Try all possible combinations of column names
    const columnVariations = [
      { userCol: 'user_id', noteCol: 'notes' },        // Standard schema
      { userCol: 'user_id', noteCol: 'note' },         // Alternative
      { userCol: 'created_by', noteCol: 'notes' },     // New schema
      { userCol: 'created_by', noteCol: 'note' }       // Alternative new
    ];

    let expense = null;
    let insertError = null;

    for (const { userCol, noteCol } of columnVariations) {
      const expenseData = {
        vendor,
        category,
        amount: parseFloat(amount),
        [noteCol]: notes || null,
        [userCol]: user.id,
        status: 'pending', // All expenses start as pending
        receipt_url: receipt_url || null,
        created_at: new Date().toISOString()
      };
      
      console.log(`Expenses POST: Trying ${userCol}/${noteCol} combination:`, expenseData);

      const result = await supabase
        .from('expenses')
        .insert([expenseData])
        .select('*')
        .single();

      if (!result.error) {
        expense = result.data;
        insertError = null;
        console.log(`Expenses POST: Success with ${userCol}/${noteCol}`);
        break;
      } else {
        insertError = result.error;
        console.log(`Expenses POST: Failed with ${userCol}/${noteCol}:`, result.error.message);
      }
    }

    console.log('Expenses POST: Insert result:', { expense, insertError: insertError?.message });

    if (insertError) {
      console.error('Expense creation error:', insertError);
      return NextResponse.json(
        { error: `Failed to create expense: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Expenses POST: Success');
    return NextResponse.json(expense, { status: 201 });

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

    // Get user profile to check role (with fallback)
    console.log('Expenses GET: Checking user profile');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Expenses GET: Profile check result:', { profile, profileError: profileError?.message });

    // Determine role and permissions
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'bookkeeper';
    const userRole = profile?.role || 'member';
    console.log('Expenses GET: User role:', userRole, 'isAdmin:', isAdmin);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const showAll = searchParams.get('showAll') === 'true'; // Admin can see all expenses

    console.log('Expenses GET: Query parameters:', { status, search, showAll });

    // Try different query approaches based on schema
    let expenses = null;
    let queryError = null;

    // First attempt: Try with created_by column
    console.log('Expenses GET: Trying with created_by column');
    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply user filtering based on role and permissions
    if (!isAdmin || !showAll) {
      // Non-admins or when not showing all: only see their own expenses
      query = query.eq('created_by', user.id);
    } else if (isAdmin && showAll) {
      // Admins when showAll=true: see all expenses in company
      // For now, we'll show all expenses. In a real system, you'd filter by company_id
      console.log('Expenses GET: Admin viewing all expenses');
    }

    // Apply status filter
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const result1 = await query;
    
    if (!result1.error) {
      expenses = result1.data;
      console.log('Expenses GET: Success with created_by column, found:', expenses?.length || 0);
    } else {
      console.log('Expenses GET: Failed with created_by:', result1.error.message);
      queryError = result1.error;

      // Second attempt: Try with user_id column
      console.log('Expenses GET: Trying with user_id column');
      let query2 = supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply user filtering based on role and permissions
      if (!isAdmin || !showAll) {
        query2 = query2.eq('user_id', user.id);
      }

      // Apply status filter
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        query2 = query2.eq('status', status);
      }

      const result2 = await query2;
      
      if (!result2.error) {
        expenses = result2.data;
        console.log('Expenses GET: Success with user_id column, found:', expenses?.length || 0);
      } else {
        console.log('Expenses GET: Failed with user_id:', result2.error.message);
        queryError = result2.error;
      }
    }

    if (!expenses && queryError) {
      console.error('Expenses GET: All query attempts failed:', queryError);
      return NextResponse.json(
        { error: `Failed to fetch expenses: ${queryError.message}` },
        { status: 500 }
      );
    }

    // Apply search filter in JavaScript if needed
    let filteredExpenses = expenses || [];
    if (search && filteredExpenses.length > 0) {
      console.log('Expenses GET: Applying search filter:', search);
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.vendor?.toLowerCase().includes(search.toLowerCase()) ||
        expense.category?.toLowerCase().includes(search.toLowerCase()) ||
        expense.notes?.toLowerCase().includes(search.toLowerCase()) ||
        expense.note?.toLowerCase().includes(search.toLowerCase())
      );
      console.log('Expenses GET: After search filter:', filteredExpenses.length);
    }

    console.log('Expenses GET: Success, returning', filteredExpenses.length, 'expenses');
    return NextResponse.json({
      expenses: filteredExpenses,
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
