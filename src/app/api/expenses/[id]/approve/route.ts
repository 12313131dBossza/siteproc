import { sbServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { sendExpenseNotifications } from '@/lib/notifications';
import { logActivity } from '@/app/api/activity/route';
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

    // Get user profile to check permissions and company
    console.log('Expense Approval: Checking user permissions');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
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

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient();

    // Check if expense exists and belongs to user's company
    const { data: expense, error: expenseError } = await serviceClient
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('company_id', profile.company_id)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json(
        { error: 'Expense not found or access denied' },
        { status: 404 }
      );
    }

    // Check if expense is pending
    if (expense.status && expense.status !== 'pending') {
      return NextResponse.json(
        { error: `Expense is already ${expense.status} and cannot be modified` },
        { status: 400 }
      );
    }

    // Update expense using service client
    console.log('Expense Approval: Updating expense status');
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    // Support both approved_* and decided_* fields based on current schema
    const updateData: any = {
      status: newStatus,
      approval_notes: notes || null,
      updated_at: new Date().toISOString()
    };
    updateData.decided_by = user.id;
    updateData.decided_at = new Date().toISOString();

    const { data: updatedExpense, error: updateError } = await serviceClient
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select('*')
      .single();

    console.log('Expense Approval: Update result:', { updatedExpense: updatedExpense?.id, updateError: updateError?.message });

    if (updateError || !updatedExpense) {
      console.error('Expense approval error:', updateError);
      return NextResponse.json(
        { error: `Failed to ${action} expense: ${updateError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Log the approval action in events table (if it exists)
    try {
      await serviceClient
        .from('events')
        .insert([{
          company_id: profile.company_id,
          actor_id: user.id,
          entity: 'expense',
          entity_id: expenseId,
          verb: `${action}_expense`,
          payload: {
            expense_id: expenseId,
            action: action,
            notes: notes,
            amount: expense.amount,
            original_status: expense.status || 'pending',
            new_status: newStatus
          }
        }]);
    } catch (eventError) {
      console.log('Expense Approval: Event logging failed (non-critical):', eventError);
    }

    console.log(`Expense Approval: Success - expense ${action}d`);
    
    // Send email notification for expense status change
    try {
      await sendExpenseNotifications(expenseId, action === 'approve' ? 'approved' : 'rejected', 'Admin');
      console.log('Expense approval notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send expense approval notification:', emailError);
      // Don't fail the request if email fails
    }

    // Log activity for expense approval/rejection
    try {
      await logActivity({
        type: 'expense',
        action: action === 'approve' ? 'approved' : 'rejected',
        title: `Expense ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `${expense.vendor || expense.description || 'Expense'} - ${expense.category || 'uncategorized'}`,
        entity_type: 'expense',
        entity_id: expenseId,
        metadata: {
          vendor: expense.vendor,
          category: expense.category,
          notes: notes,
          previous_status: expense.status || 'pending'
        },
        status: 'success',
        amount: expense.amount
      })
    } catch (logError) {
      console.error('Failed to log expense approval activity:', logError)
    }
    
    return NextResponse.json({
      message: `Expense ${action}d successfully`,
      expense: {
        ...updatedExpense,
        // Backfill vendor/category from either explicit columns or memo
        vendor: updatedExpense.vendor || updatedExpense.memo?.split(' - ')[0] || 'Unknown Vendor',
        category: (updatedExpense.category?.toLowerCase?.() || '').includes('labor') ? 'labor' :
                  (updatedExpense.category?.toLowerCase?.() || '').includes('material') ? 'materials' :
                  (updatedExpense.category?.toLowerCase?.() || '').includes('rental') ? 'rentals' :
                  (updatedExpense.memo?.toLowerCase?.().includes('labor') ? 'labor' :
                   updatedExpense.memo?.toLowerCase?.().includes('materials') ? 'materials' :
                   updatedExpense.memo?.toLowerCase?.().includes('rentals') ? 'rentals' : 'other'),
        notes: updatedExpense.approval_notes || updatedExpense.memo?.split(': ')[1] || updatedExpense.memo || ''
      }
    });

  } catch (error) {
    console.error('Expense Approval API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
