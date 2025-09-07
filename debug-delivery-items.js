// Debug delivery items - check what's in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vrkgtygzcokqoeeutvxd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugDeliveryItems() {
  console.log('🔍 DEBUGGING DELIVERY ITEMS\n');
  
  // 1. Check deliveries table structure
  console.log('1. DELIVERIES TABLE STRUCTURE:');
  try {
    const { data: deliveryColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'deliveries')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    deliveryColumns?.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
  } catch (err) {
    console.error('Error checking deliveries structure:', err.message);
  }
  
  // 2. Check delivery_items table structure
  console.log('\n2. DELIVERY_ITEMS TABLE STRUCTURE:');
  try {
    const { data: itemColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'delivery_items')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    itemColumns?.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
  } catch (err) {
    console.error('Error checking delivery_items structure:', err.message);
  }
  
  // 3. Count records in both tables
  console.log('\n3. RECORD COUNTS:');
  try {
    const { count: deliveryCount } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true });
    
    const { count: itemCount } = await supabase
      .from('delivery_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Deliveries: ${deliveryCount || 0}`);
    console.log(`   Delivery Items: ${itemCount || 0}`);
  } catch (err) {
    console.error('Error counting records:', err.message);
  }
  
  // 4. Show recent deliveries with their raw data
  console.log('\n4. RECENT DELIVERIES (RAW DATA):');
  try {
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching deliveries:', error.message);
    } else {
      deliveries?.forEach((delivery, index) => {
        console.log(`\n   ${index + 1}. Delivery #${delivery.id?.slice(-8) || 'unknown'}`);
        console.log(`      Status: ${delivery.status || 'N/A'}`);
        console.log(`      Total Amount: $${delivery.total_amount || 0}`);
        console.log(`      Order ID: ${delivery.order_id || 'N/A'}`);
        console.log(`      Driver: ${delivery.driver_name || 'N/A'}`);
        console.log(`      Created: ${delivery.created_at || 'N/A'}`);
        console.log(`      Full ID: ${delivery.id}`);
      });
    }
  } catch (err) {
    console.error('Error fetching deliveries:', err.message);
  }
  
  // 5. Show all delivery items (if any)
  console.log('\n5. ALL DELIVERY ITEMS:');
  try {
    const { data: items, error } = await supabase
      .from('delivery_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching delivery items:', error.message);
    } else if (!items || items.length === 0) {
      console.log('   ❌ NO DELIVERY ITEMS FOUND');
    } else {
      console.log(`   ✅ Found ${items.length} delivery items:`);
      items.forEach((item, index) => {
        console.log(`\n   ${index + 1}. Item #${item.id?.slice(-8) || 'unknown'}`);
        console.log(`      Product: ${item.product_name || item.description || 'N/A'}`);
        console.log(`      Quantity: ${item.quantity || 'N/A'}`);
        console.log(`      Unit Price: $${item.unit_price || 0}`);
        console.log(`      Total Price: $${item.total_price || 0}`);
        console.log(`      Delivery ID: ${item.delivery_id || 'N/A'}`);
        console.log(`      Full Item ID: ${item.id}`);
        console.log(`      Full Delivery ID: ${item.delivery_id}`);
      });
    }
  } catch (err) {
    console.error('Error fetching delivery items:', err.message);
  }
  
  // 6. Test the JOIN query that the API uses
  console.log('\n6. TESTING API JOIN QUERY:');
  try {
    const { data: joinResult, error } = await supabase
      .from('deliveries')
      .select(`*, delivery_items (*)`)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('Join query error:', error.message);
    } else {
      console.log(`   ✅ Join query returned ${joinResult?.length || 0} deliveries:`);
      joinResult?.forEach((delivery, index) => {
        console.log(`\n   ${index + 1}. Delivery #${delivery.id?.slice(-8)}`);
        console.log(`      Items Count: ${delivery.delivery_items?.length || 0}`);
        console.log(`      Items:`, delivery.delivery_items || 'None');
      });
    }
  } catch (err) {
    console.error('Error testing join query:', err.message);
  }
  
  // 7. Check foreign key constraints
  console.log('\n7. FOREIGN KEY CONSTRAINTS:');
  try {
    const { data: constraints } = await supabase
      .rpc('get_foreign_keys', { table_name: 'delivery_items' })
      .select('*');
      
    console.log('   Foreign key constraints:', constraints);
  } catch (err) {
    // Try alternative query
    try {
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'delivery_items')
        .eq('constraint_type', 'FOREIGN KEY');
      
      console.log('   Foreign key constraints:', constraints);
    } catch (err2) {
      console.log('   Could not check constraints (this is normal)');
    }
  }
}

debugDeliveryItems();
