// Debug script to check delivery sync issues
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function debug() {
  console.log('=== DEBUGGING DELIVERY SYNC ===\n');

  // 1. Check delivery_items columns
  console.log('1. Checking delivery_items table structure...');
  const { data: items, error: itemsError } = await supabase
    .from('delivery_items')
    .select('*')
    .limit(3);
  
  if (itemsError) {
    console.log('Error:', itemsError.message);
  } else if (items && items.length > 0) {
    console.log('Columns:', Object.keys(items[0]));
    console.log('Sample data:', items[0]);
  } else {
    console.log('No delivery_items found');
  }

  // 2. Check deliveries with items
  console.log('\n2. Checking deliveries with order_id...');
  const { data: deliveries, error: delError } = await supabase
    .from('deliveries')
    .select('id, order_id, status, created_at')
    .not('order_id', 'is', null)
    .limit(5);
  
  if (delError) {
    console.log('Error:', delError.message);
  } else {
    console.log('Deliveries with order_id:', deliveries);
  }

  // 3. Check purchase_orders delivery columns
  console.log('\n3. Checking purchase_orders columns...');
  const { data: orders, error: ordersError } = await supabase
    .from('purchase_orders')
    .select('id, description, status, delivery_progress, ordered_qty, delivered_qty, remaining_qty, delivered_value')
    .eq('status', 'approved')
    .limit(5);
  
  if (ordersError) {
    console.log('Error:', ordersError.message);
  } else {
    console.log('Approved orders:', orders);
  }

  // 4. Try to get delivery items with the join
  console.log('\n4. Testing the exact query from delivery-sync.ts...');
  if (deliveries && deliveries.length > 0) {
    const testOrderId = deliveries[0].order_id;
    console.log('Testing with order_id:', testOrderId);
    
    const { data: joinData, error: joinError } = await supabase
      .from('delivery_items')
      .select(`
        qty,
        quantity, 
        total_price,
        deliveries!inner(order_id, status)
      `)
      .eq('deliveries.order_id', testOrderId);
    
    if (joinError) {
      console.log('Join Error:', joinError.message);
    } else {
      console.log('Join Result:', joinData);
    }
  }

  // 5. Direct check - what's the actual data
  console.log('\n5. Direct delivery_items check for each delivery...');
  if (deliveries && deliveries.length > 0) {
    for (const del of deliveries.slice(0, 2)) {
      const { data: delItems } = await supabase
        .from('delivery_items')
        .select('*')
        .eq('delivery_id', del.id);
      console.log(`Delivery ${del.id} items:`, delItems);
    }
  }
}

debug().catch(console.error);
