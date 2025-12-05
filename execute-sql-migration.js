// Execute SQL migration on production Supabase using REST API
// Run with: node execute-sql-migration.js

const https = require('https');

const SUPABASE_URL = 'https://vrkgtygzcokqoeeutvxd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI';

const SQL_STATEMENTS = [
  // purchase_orders columns
  `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT`,
  `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS zoho_po_id TEXT`,
  
  // payments columns  
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS zoho_payment_id TEXT`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'check'`,
  
  // deliveries columns
  `ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS supplier_name TEXT`,
  
  // expenses columns (if missing)
  `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT`,
  
  // indexes
  `CREATE INDEX IF NOT EXISTS idx_purchase_orders_zoho_po_id ON purchase_orders(zoho_po_id) WHERE zoho_po_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_payments_zoho_payment_id ON payments(zoho_payment_id) WHERE zoho_payment_id IS NOT NULL`,
];

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const postData = JSON.stringify({ sql_query: sql });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Running Zoho sync columns migration on production...\n');
  
  // First, try to create the exec_sql function if it doesn't exist
  console.log('Attempting to run migrations...\n');
  
  // Since we can't run arbitrary SQL via REST API easily,
  // let's output what needs to be run in the Supabase Dashboard
  console.log('⚠️  Please run this SQL in your Supabase Dashboard SQL Editor:');
  console.log('    Go to: https://supabase.com/dashboard/project/vrkgtygzcokqoeeutvxd/sql\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`-- Zoho Sync Columns Migration
-- Run this in Supabase SQL Editor
-- Created: ${new Date().toISOString()}

-- 1. Add payment_terms and zoho_po_id to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS zoho_po_id TEXT;

-- 2. Add zoho_payment_id and payment_method to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS zoho_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'check';

-- 3. Add supplier_name to deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- 4. Add payment_method to expenses (if missing)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 5. Create indexes for faster Zoho sync lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_zoho_po_id ON purchase_orders(zoho_po_id) WHERE zoho_po_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_zoho_payment_id ON payments(zoho_payment_id) WHERE zoho_payment_id IS NOT NULL;

-- Done!
SELECT 'Migration completed successfully!' as message;
`);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('\n📋 Copy the SQL above and paste it in Supabase SQL Editor');
  console.log('   Then click "Run" to execute the migration.\n');
}

runMigration().catch(console.error);
