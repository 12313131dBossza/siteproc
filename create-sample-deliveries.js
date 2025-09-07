const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleDeliveries() {
  try {
    console.log('📦 Creating sample deliveries using existing schema...');
    
    // First, let's create some products if they don't exist
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, name')
      .limit(3);
    
    console.log('Existing products:', existingProducts?.length || 0);
    
    // Create some test products if none exist
    if (!existingProducts || existingProducts.length === 0) {
      const { data: newProducts, error: productError } = await supabase
        .from('products')
        .insert([
          {
            name: 'Steel Rebar 12mm',
            sku: 'STEEL-RBR-12',
            unit: 'tons',
            stock: 50,
            price: 800
          },
          {
            name: 'Cement Type I',
            sku: 'CEMENT-T1',
            unit: 'bags',
            stock: 200,
            price: 25
          },
          {
            name: 'Concrete Blocks',
            sku: 'BLOCK-STD',
            unit: 'pcs',
            stock: 1000,
            price: 5.50
          }
        ])
        .select();
        
      if (productError) {
        console.log('Product creation error:', productError.message);
      } else {
        console.log('✅ Created', newProducts?.length || 0, 'products');
      }
    }
    
    // Get available products for deliveries
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, unit, price')
      .limit(3);
    
    if (!products || products.length === 0) {
      console.log('❌ No products available for deliveries');
      return;
    }
    
    console.log('Using products:', products.map(p => p.name));
    
    // Create sample delivery records using the 'orders' table
    // Use 'approved' status to represent delivered orders
    const sampleDeliveries = [
      {
        product_id: products[0].id,
        user_id: '35a57302-cfec-48ef-b964-b28448ee68c4', // Use existing user ID
        qty: 3,
        note: `Delivery completed: 3 units of ${products[0].name}`,
        status: 'approved',
        decided_by: '35a57302-cfec-48ef-b964-b28448ee68c4',
        decided_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        product_id: products[1].id,
        user_id: '35a57302-cfec-48ef-b964-b28448ee68c4',
        qty: 50,
        note: `Delivery completed: 50 units of ${products[1].name}`,
        status: 'approved',
        decided_by: '35a57302-cfec-48ef-b964-b28448ee68c4',
        decided_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        product_id: products[2] ? products[2].id : products[0].id,
        user_id: '35a57302-cfec-48ef-b964-b28448ee68c4',
        qty: 100,
        note: `Delivery completed: 100 units of ${products[2] ? products[2].name : products[0].name}`,
        status: 'approved',
        decided_by: '35a57302-cfec-48ef-b964-b28448ee68c4',
        decided_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    const { data: deliveries, error: deliveryError } = await supabase
      .from('orders')
      .insert(sampleDeliveries)
      .select('id, qty, note, status, created_at, products(name, sku, unit)');
    
    if (deliveryError) {
      console.log('Delivery creation error:', deliveryError.message);
    } else {
      console.log('✅ Created', deliveries?.length || 0, 'delivery records');
      
      // Show what was created
      deliveries?.forEach((delivery, index) => {
        console.log(`  ${index + 1}. ${delivery.qty} ${delivery.products?.unit || 'pcs'} of ${delivery.products?.name || 'Unknown Product'}`);
      });
    }
    
    // Get total delivery count (approved orders represent delivered items)
    const { data: totalDeliveries, count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .not('decided_at', 'is', null); // Has delivery date
    
    console.log('📊 Total delivery records:', count || 0);
    console.log('✅ Sample deliveries setup complete!');
    console.log('🎯 Visit /order-deliveries to see the deliveries');
    
  } catch (error) {
    console.error('❌ Failed to create sample deliveries:', error);
  }
}

createSampleDeliveries();
