// Run Zoho sync columns migration on production Supabase
// Run this with: node run-zoho-migration.js

const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  // Use production Supabase
  const supabase = createClient(
    'https://vrkgtygzcokqoeeutvxd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI'
  );

  console.log('🔍 Verifying Zoho sync columns...\n');
  
  // Check if columns already exist by querying
  console.log('1. Checking purchase_orders columns...');
  const { data: poData, error: poError } = await supabase
    .from('purchase_orders')
    .select('id, payment_terms, zoho_po_id')
    .limit(1);
  
  if (poError) {
    console.log('   ❌ Missing columns:', poError.message);
    console.log('   → Run this SQL in Supabase Dashboard:');
    console.log('     ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;');
    console.log('     ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS zoho_po_id TEXT;');
  } else {
    console.log('   ✅ purchase_orders has payment_terms and zoho_po_id columns');
  }

  console.log('\n2. Checking payments columns...');
  const { data: payData, error: payError } = await supabase
    .from('payments')
    .select('id, payment_method, zoho_payment_id')
    .limit(1);
  
  if (payError) {
    console.log('   ❌ Missing columns:', payError.message);
    console.log('   → Run this SQL in Supabase Dashboard:');
    console.log('     ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT \'check\';');
    console.log('     ALTER TABLE payments ADD COLUMN IF NOT EXISTS zoho_payment_id TEXT;');
  } else {
    console.log('   ✅ payments has payment_method and zoho_payment_id columns');
  }

  console.log('\n3. Checking deliveries columns...');
  const { data: delData, error: delError } = await supabase
    .from('deliveries')
    .select('id, supplier_name')
    .limit(1);
  
  if (delError) {
    console.log('   ❌ Missing columns:', delError.message);
    console.log('   → Run this SQL in Supabase Dashboard:');
    console.log('     ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS supplier_name TEXT;');
  } else {
    console.log('   ✅ deliveries has supplier_name column');
  }

  console.log('\n4. Checking expenses columns...');
  const { data: expData, error: expError } = await supabase
    .from('expenses')
    .select('id, payment_method, zoho_expense_id')
    .limit(1);
  
  if (expError) {
    console.log('   ❌ Missing columns:', expError.message);
  } else {
    console.log('   ✅ expenses has payment_method and zoho_expense_id columns');
  }

  console.log('\n=========================================');
  console.log('If any columns are missing, run this SQL in Supabase Dashboard SQL Editor:\n');
  console.log(`
-- Add Zoho sync columns for Orders (POs) and Payments
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS zoho_po_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS zoho_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'check';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Create indexes for faster Zoho sync lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_zoho_po_id ON purchase_orders(zoho_po_id) WHERE zoho_po_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_zoho_payment_id ON payments(zoho_payment_id) WHERE zoho_payment_id IS NOT NULL;
  `);

  console.log('\n✅ Verification complete!');
}

runMigration().catch(console.error);
