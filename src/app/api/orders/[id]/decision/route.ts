import { sbServer } from '@/lib/supabase-server';
import { sendOrderNotifications } from '@/lib/notifications';
import { logActivity } from '@/app/api/activity/route';
import { autoSyncOrderToZoho } from '@/lib/zoho-autosync';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const orderId = params.id;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role (with fallback)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // If no profiles table or no profile, assume user is admin for now
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || !profile;
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can approve/reject orders' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, po_number } = body;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Check if order exists and is pending
    const { data: existingOrder, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status, product_id, quantity')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.status !== 'pending') {
      return NextResponse.json(
        { error: `Order already ${existingOrder.status}` },
        { status: 400 }
      );
    }

    // If approving, optionally update stock
    if (action === 'approve') {
      // Reduce product stock by order quantity
      const { error: stockError } = await supabase.rpc('reduce_product_stock', {
        product_id: existingOrder.product_id,
        quantity: existingOrder.quantity
      });

      if (stockError) {
        console.warn('Stock reduction failed:', stockError);
        // Continue with approval even if stock update fails
      }
    }

    // Update order status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      decided_by: user.id,
      decided_at: new Date().toISOString()
    };

    // If approving, initialize delivery tracking fields
    if (action === 'approve') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
      updateData.delivery_progress = 'not_started';
      updateData.ordered_qty = existingOrder.quantity || 0;
      updateData.delivered_qty = 0;
      updateData.remaining_qty = existingOrder.quantity || 0;
      updateData.delivered_value = 0;
    }

    if (action === 'approve' && po_number) {
      updateData.po_number = po_number;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Order update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // Send email notification for order status change
    try {
      await sendOrderNotifications(orderId, action === 'approve' ? 'approved' : 'rejected', 'Admin');
      console.log('Order decision notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send order decision notification:', emailError);
      // Don't fail the request if email fails
    }

    // Log activity for approval/rejection
    try {
      await logActivity({
        type: 'order',
        action: action === 'approve' ? 'approved' : 'rejected',
        title: `Purchase Order ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `Order ${po_number || orderId} was ${action === 'approve' ? 'approved' : 'rejected'}`,
        entity_type: 'order',
        entity_id: orderId,
        metadata: { po_number, previous_status: 'pending' },
        status: 'success'
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }

    // Sync approved order to Zoho Books
    if (action === 'approve') {
      try {
        // Get company_id from user's profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (userProfile?.company_id) {
          const zohoResult = await autoSyncOrderToZoho(userProfile.company_id, orderId, 'approved');
          if (zohoResult.synced) {
            console.log(`✅ Order synced to Zoho Books: ${zohoResult.zohoId}`);
          } else if (zohoResult.error) {
            console.log(`⚠️ Zoho sync skipped: ${zohoResult.error}`);
          }
        }
      } catch (zohoError) {
        console.error('❌ Zoho sync error:', zohoError);
        // Don't fail - order was approved successfully
      }
    }

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error('Decision API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
