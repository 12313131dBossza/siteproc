// Test the exact same query the API uses
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vrkgtygzcokqoeeutvxd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testExactQuery() {
  console.log('🔍 Testing EXACT API Query\n');
  
  // This is the exact query the API uses
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`*, delivery_items (*)`)
    .eq('company_id', '00000000-0000-4000-8000-000000000001') // Your company ID
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('❌ Query Error:', error.message);
    return;
  }

  console.log(`✅ Query returned ${deliveries?.length || 0} deliveries\n`);

  deliveries?.forEach((delivery, i) => {
    console.log(`${i+1}. Delivery #${delivery.id.slice(-8)}`);
    console.log(`   Raw delivery_items:`, delivery.delivery_items);
    console.log(`   Type:`, typeof delivery.delivery_items);
    console.log(`   Is Array:`, Array.isArray(delivery.delivery_items));
    console.log(`   Length:`, delivery.delivery_items?.length || 'undefined');
    
    if (delivery.delivery_items && delivery.delivery_items.length > 0) {
      delivery.delivery_items.forEach((item, j) => {
        console.log(`     Item ${j+1}:`, {
          id: item.id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      });
    } else {
      console.log(`     ❌ NO ITEMS FOUND`);
    }
    console.log('');
  });

  // Test transformation like the API does
  console.log('🔄 Testing API Transformation:\n');
  
  const formattedDeliveries = (deliveries || []).map((delivery) => {
    const rawItems = Array.isArray(delivery.delivery_items) ? delivery.delivery_items : [];
    
    const items = rawItems.map((it) => ({
      id: it.id || 'no-id',
      product_name: it.product_name || it.description || 'Unnamed Item',
      quantity: typeof it.quantity === 'string' ? Number(it.quantity) : (it.quantity || 1),
      unit: it.unit || 'pieces',
      unit_price: typeof it.unit_price === 'string' ? Number(it.unit_price) : (it.unit_price || 0),
      total_price: typeof it.total_price === 'string' ? Number(it.total_price) : (it.total_price || 0),
    }));
    
    console.log(`📦 Delivery #${delivery.id.slice(-8)}: ${rawItems.length} raw -> ${items.length} formatted`);
    return { ...delivery, items };
  });
  
  console.log('\n✅ Final Result:');
  formattedDeliveries.forEach((delivery, i) => {
    console.log(`${i+1}. Delivery #${delivery.id.slice(-8)}: ${delivery.items?.length || 0} items`);
    if (delivery.items?.length > 0) {
      delivery.items.forEach((item, j) => {
        console.log(`     ${j+1}. ${item.product_name} - Qty: ${item.quantity} - $${item.total_price}`);
      });
    }
  });
}

testExactQuery().catch(console.error);
