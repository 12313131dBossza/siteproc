// Check supplier delivery filtering setup
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function checkSupplierSetup() {
  console.log('🔍 Checking Supplier Delivery Filtering Setup...\n');

  // 1. Check supplier_assignments table
  console.log('=== 1. Supplier Assignments Table ===');
  const { data: assignments, error: aErr } = await supabase
    .from('supplier_assignments')
    .select('*')
    .limit(5);
  
  if (aErr) {
    console.log('❌ Table may not exist:', aErr.message);
    console.log('\n📝 You need to create the supplier_assignments table:');
    console.log(`
CREATE TABLE supplier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  delivery_id UUID REFERENCES deliveries(id),
  order_id UUID REFERENCES purchase_orders(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
    `);
  } else {
    console.log('✅ Table exists, found', assignments?.length || 0, 'assignments');
    if (assignments?.length > 0) {
      console.log(JSON.stringify(assignments, null, 2));
    }
  }

  // 2. Check project_members with supplier type
  console.log('\n=== 2. Supplier Project Members ===');
  const { data: suppliers, error: sErr } = await supabase
    .from('project_members')
    .select(`
      user_id,
      project_id,
      external_type,
      status,
      profiles:user_id (email, full_name)
    `)
    .eq('external_type', 'supplier')
    .limit(10);

  if (sErr) {
    console.log('❌ Error:', sErr.message);
  } else if (suppliers?.length === 0) {
    console.log('⚠️  No suppliers found in project_members');
    console.log('\n📝 To add a supplier to a project:');
    console.log(`
INSERT INTO project_members (user_id, project_id, external_type, status, role)
VALUES (
  'SUPPLIER_USER_ID',
  'PROJECT_ID',
  'supplier',
  'active',
  'viewer'
);
    `);
  } else {
    console.log('✅ Found', suppliers.length, 'supplier(s):');
    suppliers.forEach(s => {
      console.log(`  - User: ${s.profiles?.email || s.user_id}`);
      console.log(`    Project: ${s.project_id}`);
    });
  }

  // 3. Check deliveries
  console.log('\n=== 3. Sample Deliveries ===');
  const { data: deliveries, error: dErr } = await supabase
    .from('deliveries')
    .select('id, project_id, order_id, status, created_at')
    .limit(5);

  if (dErr) {
    console.log('❌ Error:', dErr.message);
  } else {
    console.log('Found', deliveries?.length || 0, 'deliveries');
    deliveries?.forEach(d => {
      console.log(`  - ID: ${d.id?.slice(0, 8)}... Project: ${d.project_id?.slice(0, 8) || 'N/A'} Order: ${d.order_id?.slice(0, 8) || 'N/A'} Status: ${d.status}`);
    });
  }

  // 4. Test instructions
  console.log('\n=== 📋 How to Test ===');
  console.log(`
1. Create a test user with supplier role:
   - Sign up a new user at /signup
   - In Supabase, set their profile.role = 'viewer'
   - Add them to project_members with external_type = 'supplier'

2. Assign deliveries to supplier:
   - Insert into supplier_assignments with their user_id
   - Can assign by project_id, delivery_id, or order_id

3. Log in as supplier:
   - They should only see Deliveries + Messages in sidebar
   - Deliveries page should only show their assigned deliveries

4. Quick SQL to set up a test:
   
   -- Make existing user a supplier (replace IDs)
   UPDATE profiles SET role = 'viewer' WHERE id = 'USER_ID';
   
   INSERT INTO project_members (user_id, project_id, external_type, status, role)
   VALUES ('USER_ID', 'PROJECT_ID', 'supplier', 'active', 'viewer');
   
   INSERT INTO supplier_assignments (supplier_id, project_id, status)
   VALUES ('USER_ID', 'PROJECT_ID', 'active');
  `);
}

checkSupplierSetup().catch(console.error);
