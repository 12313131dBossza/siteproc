const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createOrderDeliveriesSchema() {
  try {
    console.log('🔧 Creating Order Deliveries schema...');
    
    // The existing 'orders' table seems to be for a different system (product orders)
    // Let's create proper procurement orders and order_deliveries tables
    
    console.log('📦 Creating procurement_orders table...');
    const { error: createOrdersError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS procurement_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          order_number VARCHAR(50) UNIQUE,
          supplier_name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'draft',
          total_amount DECIMAL(12,2) DEFAULT 0,
          notes TEXT,
          delivery_address TEXT,
          delivery_date DATE,
          created_by UUID,
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    if (createOrdersError) {
      console.log('Orders table error:', createOrdersError.message);
    } else {
      console.log('✅ Procurement orders table ready');
    }

    console.log('📦 Creating procurement_order_items table...');
    const { error: createItemsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS procurement_order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES procurement_orders(id),
          product_id UUID,
          product_name VARCHAR(255),
          sku VARCHAR(100),
          unit VARCHAR(50) DEFAULT 'pcs',
          ordered_qty DECIMAL(10,2),
          delivered_qty DECIMAL(10,2) DEFAULT 0,
          unit_price DECIMAL(12,2),
          total_price DECIMAL(12,2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    if (createItemsError) {
      console.log('Order items table error:', createItemsError.message);
    } else {
      console.log('✅ Procurement order items table ready');
    }

    console.log('📦 Creating order_deliveries table...');
    const { error: createDeliveriesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS order_deliveries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES procurement_orders(id),
          product_id UUID,
          product_name VARCHAR(255),
          delivered_qty DECIMAL(10,2),
          delivered_at TIMESTAMPTZ DEFAULT now(),
          note TEXT,
          proof_url TEXT,
          supplier_id UUID,
          company_id UUID,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    if (createDeliveriesError) {
      console.log('Deliveries table error:', createDeliveriesError.message);
    } else {
      console.log('✅ Order deliveries table ready');
    }

    // Now let's add some sample data
    console.log('📦 Adding sample data...');
    
    const companyId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '550e8400-e29b-41d4-a716-446655440099';
    
    // Add sample orders
    const { data: order1, error: order1Error } = await supabase
      .from('procurement_orders')
      .insert({
        id: '550e8400-e29b-41d4-a716-446655440010',
        company_id: companyId,
        order_number: 'PO-2025-001',
        supplier_name: 'ABC Steel Supply',
        status: 'approved',
        total_amount: 5000.00,
        notes: 'Urgent order for construction project',
        delivery_address: '123 Construction Site, Building A',
        created_by: userId,
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (order1Error) {
      console.log('Sample order 1 error:', order1Error.message);
    } else {
      console.log('✅ Sample order 1 created');
    }

    // Add order items
    const { error: item1Error } = await supabase
      .from('procurement_order_items')
      .insert([
        {
          order_id: '550e8400-e29b-41d4-a716-446655440010',
          product_id: '550e8400-e29b-41d4-a716-446655440001',
          product_name: 'Steel Rebar 12mm',
          sku: 'STEEL-RBR-12',
          unit: 'tons',
          ordered_qty: 5.00,
          delivered_qty: 0.00,
          unit_price: 800.00,
          total_price: 4000.00
        },
        {
          order_id: '550e8400-e29b-41d4-a716-446655440010',
          product_id: '550e8400-e29b-41d4-a716-446655440002',
          product_name: 'Concrete Blocks',
          sku: 'BLOCK-STD',
          unit: 'pcs',
          ordered_qty: 200.00,
          delivered_qty: 0.00,
          unit_price: 5.00,
          total_price: 1000.00
        }
      ]);

    if (item1Error) {
      console.log('Sample items error:', item1Error.message);
    } else {
      console.log('✅ Sample order items created');
    }

    console.log('✅ Order deliveries system setup complete!');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
  }
}

createOrderDeliveriesSchema();
