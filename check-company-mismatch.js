// Check company_id mismatch issue
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vrkgtygzcokqoeeutvxd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkCompanyMismatch() {
  console.log('🔍 Checking Company ID Mismatch\n');
  
  const yourCompanyId = '00000000-0000-4000-8000-000000000001';
  
  // Check deliveries with company_id
  console.log('📦 Deliveries by company:');
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, company_id, total_amount, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  deliveries?.forEach((d, i) => {
    const hasYourCompany = d.company_id === yourCompanyId;
    console.log(`${i+1}. #${d.id.slice(-8)} - Company: ${d.company_id?.slice(-8) || 'null'} ${hasYourCompany ? '✅' : '❌'}`);
  });
  
  // Check delivery_items structure
  console.log('\n🏗️ delivery_items table structure:');
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'delivery_items')
    .eq('table_schema', 'public');
    
  columns?.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type}`);
  });
  
  // Check delivery_items with company info
  console.log('\n📦 Delivery Items with company info:');
  const { data: items } = await supabase
    .from('delivery_items')
    .select('id, delivery_id, product_name, company_id')
    .limit(5);
    
  for (const item of items || []) {
    // Get the parent delivery's company_id
    const { data: parentDelivery } = await supabase
      .from('deliveries')
      .select('company_id')
      .eq('id', item.delivery_id)
      .single();
      
    const itemCompany = item.company_id?.slice(-8) || 'null';
    const deliveryCompany = parentDelivery?.company_id?.slice(-8) || 'null';
    const match = item.company_id === parentDelivery?.company_id;
    
    console.log(`   Item #${item.id.slice(-8)} -> Delivery #${item.delivery_id.slice(-8)}`);
    console.log(`     Item company: ${itemCompany}`);
    console.log(`     Delivery company: ${deliveryCompany} ${match ? '✅' : '❌'}`);
    console.log(`     Product: ${item.product_name || 'unnamed'}`);
    console.log('');
  }
  
  // Test query without company filter (should work)
  console.log('🔗 Query WITHOUT company filter:');
  const { data: allDeliveries } = await supabase
    .from('deliveries')
    .select(`id, delivery_items(*)`)
    .order('created_at', { ascending: false })
    .limit(3);
    
  allDeliveries?.forEach((d, i) => {
    console.log(`${i+1}. #${d.id.slice(-8)}: ${d.delivery_items?.length || 0} items`);
  });
  
  // Test query WITH company filter (broken)
  console.log('\n🔗 Query WITH company filter:');
  const { data: filteredDeliveries } = await supabase
    .from('deliveries')
    .select(`id, delivery_items(*)`)
    .eq('company_id', yourCompanyId)
    .order('created_at', { ascending: false })
    .limit(3);
    
  filteredDeliveries?.forEach((d, i) => {
    console.log(`${i+1}. #${d.id.slice(-8)}: ${d.delivery_items?.length || 0} items`);
  });
}

checkCompanyMismatch().catch(console.error);
