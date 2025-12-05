// Execute SQL migration on production Supabase using direct PostgreSQL connection
// Run with: node run-pg-migration.js

const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vrkgtygzcokqoeeutvxd:yaibohermawan123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const SQL_MIGRATION = `
-- Zoho Sync Columns Migration

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
`;

async function runMigration() {
  console.log('🚀 Connecting to production Supabase PostgreSQL...\n');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('📝 Running migration...\n');
    
    // Split into individual statements and run each
    const statements = SQL_MIGRATION
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      if (stmt.length > 0) {
        console.log(`   Running: ${stmt.substring(0, 60)}...`);
        try {
          await client.query(stmt);
          console.log('   ✅ Success\n');
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log('   ⚠️  Already exists (OK)\n');
          } else {
            console.log(`   ❌ Error: ${err.message}\n`);
          }
        }
      }
    }
    
    console.log('\n🎉 Migration completed!\n');
    
    // Verify columns exist
    console.log('🔍 Verifying columns...\n');
    
    const verifyQueries = [
      { table: 'purchase_orders', columns: ['payment_terms', 'zoho_po_id'] },
      { table: 'payments', columns: ['payment_method', 'zoho_payment_id'] },
      { table: 'deliveries', columns: ['supplier_name'] },
      { table: 'expenses', columns: ['payment_method'] }
    ];
    
    for (const { table, columns } of verifyQueries) {
      try {
        const result = await client.query(`SELECT ${columns.join(', ')} FROM ${table} LIMIT 1`);
        console.log(`   ✅ ${table}: ${columns.join(', ')} columns exist`);
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    await client.end();
    console.log('\n👋 Disconnected from database');
  }
}

runMigration().catch(console.error);
