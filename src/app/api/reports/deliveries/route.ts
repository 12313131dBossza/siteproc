import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { getCurrentUserProfile } from '@/lib/server-utils';

// GET /api/reports/deliveries - Delivery Summary Report
export async function GET(request: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentUserProfile();

    if (authError || !profile || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await sbServer();

    // Get all deliveries for the company
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id, order_id, delivery_date, status, driver_name, vehicle_number, total_amount, created_at, notes')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (deliveriesError) {
      console.error('Error fetching deliveries:', deliveriesError);
      return NextResponse.json(
        { error: 'Failed to fetch delivery data', details: deliveriesError.message },
        { status: 500 }
      );
    }

    // Categorize by status
    const pending = deliveries?.filter(d => d.status === 'pending') || [];
    const inTransit = deliveries?.filter(d => d.status === 'in_transit' || d.status === 'partial') || [];
    const delivered = deliveries?.filter(d => d.status === 'delivered' || d.status === 'completed') || [];
    const cancelled = deliveries?.filter(d => d.status === 'cancelled') || [];

    // Calculate on-time performance
    const deliveredWithDates = delivered.filter(d => d.delivery_date);
    const onTimeDeliveries = deliveredWithDates.filter(d => {
      const deliveryDate = new Date(d.delivery_date);
      const createdDate = new Date(d.created_at);
      const daysDiff = Math.floor((deliveryDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7; // Consider on-time if delivered within 7 days
    });

    const onTimePercentage = deliveredWithDates.length > 0 
      ? (onTimeDeliveries.length / deliveredWithDates.length) * 100 
      : 0;

    // Calculate total values
    const totalValue = deliveries?.reduce((sum, d) => sum + (parseFloat(d.total_amount?.toString() || '0')), 0) || 0;
    const deliveredValue = delivered.reduce((sum, d) => sum + (parseFloat(d.total_amount?.toString() || '0')), 0);
    const pendingValue = pending.reduce((sum, d) => sum + (parseFloat(d.total_amount?.toString() || '0')), 0);

    // Format the data
    const report = deliveries?.map(delivery => ({
      id: delivery.id,
      order_id: delivery.order_id,
      delivery_date: delivery.delivery_date,
      status: delivery.status,
      driver_name: delivery.driver_name || 'Not assigned',
      vehicle_number: delivery.vehicle_number || 'N/A',
      amount: parseFloat(delivery.total_amount?.toString() || '0'),
      created_at: delivery.created_at,
      notes: delivery.notes,
      age_days: Math.floor((new Date().getTime() - new Date(delivery.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      is_delayed: delivery.status === 'pending' && 
        Math.floor((new Date().getTime() - new Date(delivery.created_at).getTime()) / (1000 * 60 * 60 * 24)) > 7
    })) || [];

    // Group by driver
    const byDriver: Record<string, { count: number; total: number }> = {};
    deliveries?.forEach(d => {
      const driver = d.driver_name || 'Unassigned';
      if (!byDriver[driver]) {
        byDriver[driver] = { count: 0, total: 0 };
      }
      byDriver[driver].count++;
      byDriver[driver].total += parseFloat(d.total_amount?.toString() || '0');
    });

    return NextResponse.json({
      ok: true,
      data: report,
      summary: {
        total_deliveries: deliveries?.length || 0,
        total_value: totalValue,
        pending_count: pending.length,
        pending_value: pendingValue,
        in_transit_count: inTransit.length,
        delivered_count: delivered.length,
        delivered_value: deliveredValue,
        cancelled_count: cancelled.length,
        on_time_percentage: onTimePercentage,
        on_time_count: onTimeDeliveries.length,
        delayed_count: report.filter(d => d.is_delayed).length,
        by_driver: byDriver
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/reports/deliveries:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
