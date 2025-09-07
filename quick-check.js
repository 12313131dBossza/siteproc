// Quick check for delivery items issue
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vrkgtygzcokqoeeutvxd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function quickCheck() {
  console.log('🔍 Quick Delivery Items Check\n');
  
  // Check delivery count
  const { count: deliveryCount } = await supabase
    .from('deliveries')
    .select('*', { count: 'exact', head: true });
  
  // Check delivery_items count
  const { count: itemCount } = await supabase
    .from('delivery_items')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Deliveries: ${deliveryCount || 0}`);
  console.log(`📦 Delivery Items: ${itemCount || 0}\n`);
  
  // Get recent deliveries
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, total_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log('📋 Recent Deliveries:');
  deliveries?.forEach((d, i) => {
    console.log(`${i+1}. #${d.id.slice(-8)} - $${d.total_amount} (${d.status})`);
  });
  
  // Check if any delivery_items exist
  const { data: items } = await supabase
    .from('delivery_items')
    .select('*')
    .limit(5);
  
  console.log(`\n📦 Delivery Items Sample (${items?.length || 0} found):`);
  items?.forEach((item, i) => {
    console.log(`${i+1}. ${item.product_name || item.description || 'No name'} - Qty: ${item.quantity} - $${item.total_price}`);
    console.log(`   Delivery ID: ${item.delivery_id?.slice(-8) || 'None'}`);
  });
  
  // Test the join query
  console.log('\n🔗 Testing JOIN query:');
  const { data: joined, error } = await supabase
    .from('deliveries')
    .select('id, total_amount, delivery_items(*)')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (error) {
    console.log('❌ JOIN Error:', error.message);
  } else {
    joined?.forEach((delivery, i) => {
      console.log(`${i+1}. Delivery #${delivery.id.slice(-8)}: ${delivery.delivery_items?.length || 0} items`);
    });
  }
}

quickCheck().catch(console.error);
