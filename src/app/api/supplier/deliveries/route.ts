import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: Get supplier's assigned deliveries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    // Check if user is a supplier
    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Not a supplier' }, { status: 403 });
    }

    // Get supplier's assignments
    const { data: assignments, error: assignmentError } = await adminClient
      .from('supplier_assignments')
      .select(`
        id,
        project_id,
        delivery_id,
        order_id,
        status,
        projects:project_id(id, name, company_id, companies:company_id(name))
      `)
      .eq('supplier_id', user.id)
      .eq('status', 'active');

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      // Fall back to checking deliveries directly
    }

    // Get deliveries assigned to this supplier
    // For now, we'll use a simpler approach - get deliveries where the supplier is assigned
    const deliveryIds = assignments?.filter(a => a.delivery_id).map(a => a.delivery_id) || [];
    const projectIds = assignments?.filter(a => a.project_id).map(a => a.project_id) || [];

    let deliveriesQuery = adminClient
      .from('deliveries')
      .select(`
        id,
        order_id,
        project_id,
        delivery_date,
        status,
        address,
        notes,
        pod_url,
        items,
        created_at,
        projects:project_id(id, name, company_id, companies:company_id(name))
      `)
      .order('delivery_date', { ascending: true });

    // Filter by either specific deliveries or project-level assignment
    if (deliveryIds.length > 0 || projectIds.length > 0) {
      if (deliveryIds.length > 0 && projectIds.length > 0) {
        deliveriesQuery = deliveriesQuery.or(`id.in.(${deliveryIds.join(',')}),project_id.in.(${projectIds.join(',')})`);
      } else if (deliveryIds.length > 0) {
        deliveriesQuery = deliveriesQuery.in('id', deliveryIds);
      } else {
        deliveriesQuery = deliveriesQuery.in('project_id', projectIds);
      }
    } else {
      // No assignments found
      return NextResponse.json({ deliveries: [] });
    }

    // Get deliveries from last 30 days or upcoming
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    deliveriesQuery = deliveriesQuery.gte('delivery_date', thirtyDaysAgo.toISOString());

    const { data: deliveries, error: deliveriesError } = await deliveriesQuery;

    if (deliveriesError) {
      console.error('Error fetching deliveries:', deliveriesError);
      return NextResponse.json({ error: deliveriesError.message }, { status: 500 });
    }

    // Transform deliveries for the frontend
    const transformedDeliveries = (deliveries || []).map(d => ({
      id: d.id,
      order_id: d.order_id,
      project_id: d.project_id,
      project_name: (d.projects as any)?.name || 'Unknown Project',
      company_name: (d.projects as any)?.companies?.name || 'Unknown Company',
      delivery_date: d.delivery_date,
      status: d.status || 'pending',
      items: d.items || [],
      address: d.address,
      notes: d.notes,
      pod_url: d.pod_url,
    }));

    return NextResponse.json({ deliveries: transformedDeliveries });
  } catch (error: any) {
    console.error('Supplier deliveries error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
