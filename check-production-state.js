// Check current production database state
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://gjstirrsnkqxsbolsufn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3RpcnJzbmtxeHNib2xzdWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDk4MTI0NSwiZXhwIjoyMDQ2NTU3MjQ1fQ.FrWb4V0Q-Q5u2WtT-K8ZLfQNO8Mg2oQ3jDRz1fB1pBU';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkProductionState() {
  console.log('\n=== CHECKING PRODUCTION DATABASE STATE ===\n');
  console.log('Database:', PROD_URL);
  
  // Check TestCo
  const { data: testco } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'TestCo')
    .single();
  
  console.log('\n1️⃣ TestCo Company:');
  if (testco) {
    console.log('   ✅ Exists:', testco.id);
  } else {
    console.log('   ❌ Does not exist');
  }
  
  // Check all users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, company_id, companies(name)');
  
  console.log('\n2️⃣ All Users in Database:');
  if (users && users.length > 0) {
    users.forEach(u => {
      console.log(`   - ${u.email} → ${u.companies?.name || 'No company'} (ID: ${u.id})`);
    });
  } else {
    console.log('   ❌ No users found');
  }
  
  // Check auth users
  const { data: authUsers, error } = await supabase.auth.admin.listUsers();
  
  console.log('\n3️⃣ Auth Users (from Supabase Auth):');
  if (authUsers?.users && authUsers.users.length > 0) {
    authUsers.users.forEach(u => {
      console.log(`   - ${u.email} (ID: ${u.id}) - Created: ${new Date(u.created_at).toLocaleDateString()}`);
    });
  } else {
    console.log('   ❌ No auth users found');
    if (error) console.log('   Error:', error.message);
  }
  
  // If TestCo exists, check its data
  if (testco) {
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', testco.id);
    
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', testco.id);
    
    console.log('\n4️⃣ TestCo Data:');
    console.log(`   Projects: ${projects?.length || 0}`);
    console.log(`   Expenses: ${expenses?.length || 0}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('RECOMMENDATION:');
  if (!authUsers?.users || authUsers.users.length === 0) {
    console.log('❌ No users in auth system');
    console.log('→ You need to SIGN UP on production first');
    console.log('→ Go to your production site and create an account');
  } else if (testco && authUsers.users.length > 0) {
    console.log('✅ Both company and users exist');
    console.log('→ Ready to run the data setup script');
  }
}

checkProductionState();
