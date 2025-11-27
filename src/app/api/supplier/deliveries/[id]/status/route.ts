import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH: Update delivery status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Not a supplier' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    // Validate status transition
    const validStatuses = ['pending', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify supplier has access to this delivery
    const { data: assignments } = await adminClient
      .from('supplier_assignments')
      .select('id, delivery_id, project_id')
      .eq('supplier_id', user.id)
      .eq('status', 'active');

    const { data: delivery } = await adminClient
      .from('deliveries')
      .select('id, project_id')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Check if supplier is assigned to this delivery or project
    const hasAccess = assignments?.some(a => 
      a.delivery_id === deliveryId || a.project_id === delivery.project_id
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Not assigned to this delivery' }, { status: 403 });
    }

    // Update delivery status
    const updateData: any = { status };
    if (status === 'in_transit') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data: updatedDelivery, error: updateError } = await adminClient
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating delivery:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ delivery: updatedDelivery });
  } catch (error: any) {
    console.error('Delivery status update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
