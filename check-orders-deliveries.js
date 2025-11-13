const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkTables() {
  console.log('🔍 Checking orders and deliveries tables...\n');
  
  // Check purchase_orders table
  const { data: orders, error: ordersError } = await supabase
    .from('purchase_orders')
    .select('*')
    .limit(1);
  
  if (ordersError) {
    console.log('❌ purchase_orders error:', ordersError.message);
  } else if (orders && orders.length > 0) {
    console.log('✅ purchase_orders table exists');
    console.log('Columns:', Object.keys(orders[0]).sort());
    console.log('Has company_id:', 'company_id' in orders[0]);
  } else {
    console.log('⚠️ purchase_orders table exists but is empty');
    // Try to describe the table structure
    const { data: schema } = await supabase
      .from('purchase_orders')
      .select('*')
      .limit(0);
    console.log('Schema check:', schema);
  }
  
  console.log('\n---\n');
  
  // Check deliveries table
  const { data: deliveries, error: deliveriesError } = await supabase
    .from('deliveries')
    .select('*')
    .limit(1);
  
  if (deliveriesError) {
    console.log('❌ deliveries error:', deliveriesError.message);
  } else if (deliveries && deliveries.length > 0) {
    console.log('✅ deliveries table exists');
    console.log('Columns:', Object.keys(deliveries[0]).sort());
    console.log('Has company_id:', 'company_id' in deliveries[0]);
  } else {
    console.log('⚠️ deliveries table exists but is empty');
  }
  
  // Count total records
  console.log('\n📊 Record counts:');
  const { count: orderCount } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true });
  console.log('Orders:', orderCount || 0);
  
  const { count: deliveryCount } = await supabase
    .from('deliveries')
    .select('*', { count: 'exact', head: true });
  console.log('Deliveries:', deliveryCount || 0);
}

checkTables();
