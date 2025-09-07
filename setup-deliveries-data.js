const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDeliveriesSystem() {
  try {
    console.log('🚀 Setting up deliveries system...');

    // Create sample company
    const companyId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '550e8400-e29b-41d4-a716-446655440099';

    // 1. Create/update products table structure and sample data
    console.log('📦 Creating products...');
    const { error: productsError } = await supabase
      .from('products')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          company_id: companyId,
          name: 'Steel Rebar 12mm',
          sku: 'STEEL-RBR-12',
          unit: 'tons',
          stock_qty: 50.00,
          unit_price: 800.00
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          company_id: companyId,
          name: 'Cement Type I',
          sku: 'CEMENT-T1',
          unit: 'bags',
          stock_qty: 200.00,
          unit_price: 25.00
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          company_id: companyId,
          name: 'Concrete Blocks',
          sku: 'BLOCK-STD',
          unit: 'pcs',
          stock_qty: 1000.00,
          unit_price: 5.50
        }
      ]);

    if (productsError) {
      console.log('ℹ️ Products may already exist:', productsError.message);
    } else {
      console.log('✅ Products created/updated');
    }

    // 2. Create sample orders
    console.log('📋 Creating sample orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          company_id: companyId,
          order_number: 'PO-2025-001',
          status: 'approved',
          supplier_name: 'ABC Steel Supply',
          total_amount: 5000.00,
          notes: 'Urgent order for construction project',
          delivery_address: '123 Construction Site, Building A',
          created_by: userId,
          approved_by: userId,
          approved_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          company_id: companyId,
          order_number: 'PO-2025-002',
          status: 'approved',
          supplier_name: 'Best Cement Co',
          total_amount: 2500.00,
          notes: 'Monthly cement order',
          delivery_address: '123 Construction Site, Storage B',
          created_by: userId,
          approved_by: userId,
          approved_at: new Date().toISOString()
        }
      ])
      .select();

    if (ordersError) {
      console.log('ℹ️ Orders may already exist:', ordersError.message);
    } else {
      console.log('✅ Orders created/updated');
    }

    // 3. Create order items
    console.log('📦 Creating order items...');
    const { error: itemsError } = await supabase
      .from('order_items')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          order_id: '550e8400-e29b-41d4-a716-446655440010',
          product_id: '550e8400-e29b-41d4-a716-446655440001', // Steel Rebar
          ordered_qty: 5.00,
          delivered_qty: 0.00,
          unit_price: 800.00,
          total_price: 4000.00
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          order_id: '550e8400-e29b-41d4-a716-446655440010',
          product_id: '550e8400-e29b-41d4-a716-446655440003', // Concrete Blocks
          ordered_qty: 200.00,
          delivered_qty: 0.00,
          unit_price: 5.00,
          total_price: 1000.00
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440022',
          order_id: '550e8400-e29b-41d4-a716-446655440011',
          product_id: '550e8400-e29b-41d4-a716-446655440002', // Cement
          ordered_qty: 100.00,
          delivered_qty: 0.00,
          unit_price: 25.00,
          total_price: 2500.00
        }
      ]);

    if (itemsError) {
      console.log('ℹ️ Order items may already exist:', itemsError.message);
    } else {
      console.log('✅ Order items created/updated');
    }

    // 4. Verify the setup
    console.log('🔍 Verifying setup...');
    
    const { data: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const { data: productCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const { data: itemCount } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true });

    console.log('📊 Database status:');
    console.log(`  - Orders: ${orderCount?.length || 0}`);
    console.log(`  - Products: ${productCount?.length || 0}`);
    console.log(`  - Order Items: ${itemCount?.length || 0}`);
    
    console.log('✅ Deliveries system setup complete!');
    console.log('');
    console.log('🎯 Ready for testing:');
    console.log('  1. Orders are ready to receive deliveries');
    console.log('  2. Visit /order-deliveries to see the interface');
    console.log('  3. Use POST /api/order-deliveries to record deliveries');
    console.log('  4. Test the complete delivery workflow');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupDeliveriesSystem();
