const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Try to get a sample record from each table to see the structure
    const { data: orderSample, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    const { data: productSample, error: productError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
      
    const { data: deliverySample, error: deliveryError } = await supabase
      .from('deliveries')
      .select('*')
      .limit(1);

    console.log('Orders table structure:', orderSample || orderError?.message);
    console.log('Products table structure:', productSample || productError?.message);
    console.log('Deliveries table structure:', deliverySample || deliveryError?.message);
    
    // Try to create a simple product first
    console.log('\\n📦 Creating simple test data...');
    
    const { data: newOrder, error: newOrderError } = await supabase
      .from('orders')
      .insert({
        company_id: '550e8400-e29b-41d4-a716-446655440000',
        order_number: 'TEST-001',
        status: 'approved',
        total_amount: 1000
      })
      .select()
      .single();
      
    if (newOrderError) {
      console.log('Order creation error:', newOrderError);
    } else {
      console.log('✅ Test order created:', newOrder.id);
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema();
