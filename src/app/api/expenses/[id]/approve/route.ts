import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('Expense Approval: Starting request processing');
    
    const supabase = await sbServer();
    const expenseId = params.id;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Expense Approval: Auth check result:', { user: user?.id, authError: authError?.message });
    
    if (authError || !user) {
      console.log('Expense Approval: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    console.log('Expense Approval: Request body:', body);
    
    const { action, notes } = body; // action: 'approve' or 'reject'

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      console.log('Expense Approval: Invalid action');
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get user profile to check permissions
    console.log('Expense Approval: Checking user permissions');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Expense Approval: Profile check result:', { profile, profileError: profileError?.message });

    // Check if user has approval permissions
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'bookkeeper';
    if (!isAdmin) {
      console.log('Expense Approval: User lacks permissions');
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins, owners, or bookkeepers can approve expenses.' },
        { status: 403 }
      );
    }

    // Update expense status - try different column combinations
    console.log('Expense Approval: Updating expense status');
    
    const columnVariations = [
      { reviewerCol: 'approved_by', noteCol: 'approval_notes', dateCol: 'approved_at' },
      { reviewerCol: 'reviewed_by', noteCol: 'review_notes', dateCol: 'reviewed_at' },
      { reviewerCol: 'decided_by', noteCol: 'decision_notes', dateCol: 'decided_at' }
    ];

    let updatedExpense = null;
    let updateError = null;

    for (const { reviewerCol, noteCol, dateCol } of columnVariations) {
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        [reviewerCol]: user.id,
        [dateCol]: new Date().toISOString(),
        [noteCol]: notes || null
      };
      
      console.log(`Expense Approval: Trying ${reviewerCol}/${noteCol}/${dateCol} combination:`, updateData);

      const result = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId)
        .select('*')
        .single();

      if (!result.error) {
        updatedExpense = result.data;
        updateError = null;
        console.log(`Expense Approval: Success with ${reviewerCol}/${noteCol}/${dateCol}`);
        break;
      } else {
        updateError = result.error;
        console.log(`Expense Approval: Failed with ${reviewerCol}/${noteCol}/${dateCol}:`, result.error.message);
      }
    }

    // Fallback: try simple status update
    if (!updatedExpense && updateError) {
      console.log('Expense Approval: Trying simple status update');
      const result = await supabase
        .from('expenses')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected'
        })
        .eq('id', expenseId)
        .select('*')
        .single();

      if (!result.error) {
        updatedExpense = result.data;
        updateError = null;
        console.log('Expense Approval: Success with simple status update');
      } else {
        updateError = result.error;
        console.log('Expense Approval: Failed with simple status update:', result.error.message);
      }
    }

    console.log('Expense Approval: Update result:', { updatedExpense, updateError: updateError?.message });

    if (updateError || !updatedExpense) {
      console.error('Expense approval error:', updateError);
      return NextResponse.json(
        { error: `Failed to ${action} expense: ${updateError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log(`Expense Approval: Success - expense ${action}d`);
    return NextResponse.json({
      message: `Expense ${action}d successfully`,
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Expense Approval API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
