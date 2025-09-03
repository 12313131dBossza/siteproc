import { sbServer } from '@/lib/supabase-server';
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admin/owner can make decisions
    const isAdmin = profile.role === 'admin' || profile.role === 'owner';
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
      .from('orders')
      .select('id, status, product_id, qty')
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
        quantity: existingOrder.qty
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

    if (action === 'approve' && po_number) {
      updateData.po_number = po_number;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        product:products(id, name, sku, price, unit),
        created_by_profile:profiles!created_by(id, full_name, email),
        decided_by_profile:profiles!decided_by(id, full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Order update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
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
