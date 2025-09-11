const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vrkgtygzcokqoeeutvxd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixExpenseCompanyId() {
  console.log('🔧 FIXING EXPENSE COMPANY ID MISMATCH...\n');
  
  // Step 1: Check current admin user
  console.log('STEP 1: Current admin user');
  const { data: admin } = await supabase
    .from('profiles')
    .select('id, role, company_id')
    .eq('role', 'admin')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (admin) {
    console.log('Admin user:', admin);
    console.log('Admin company_id:', admin.company_id);
  } else {
    console.log('No admin user found');
    return;
  }
  
  // Step 2: Check test expenses
  console.log('\nSTEP 2: Current test expenses');
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, amount, company_id, user_id, description, memo')
    .or('description.ilike.%WORKING TEST%,memo.ilike.%WORKING TEST%')
    .order('created_at', { ascending: false });
  
  console.log('Found expenses:', expenses?.length || 0);
  expenses?.forEach(exp => {
    console.log(`- ID: ${exp.id}, Amount: $${exp.amount}, Company: ${exp.company_id}, User: ${exp.user_id}`);
  });
  
  // Step 3: Fix the expenses
  console.log('\nSTEP 3: Updating expenses to match admin user');
  const { data: updated, error } = await supabase
    .from('expenses')
    .update({
      company_id: admin.company_id,
      user_id: admin.id
    })
    .or('description.ilike.%WORKING TEST%,memo.ilike.%WORKING TEST%')
    .select();
  
  if (error) {
    console.error('Error updating expenses:', error);
  } else {
    console.log('Updated expenses:', updated?.length || 0);
  }
  
  // Step 4: Verify the fix
  console.log('\nSTEP 4: Verification after fix');
  const { data: verification } = await supabase
    .from('expenses')
    .select('id, amount, company_id, user_id')
    .or('description.ilike.%WORKING TEST%,memo.ilike.%WORKING TEST%')
    .order('created_at', { ascending: false });
  
  verification?.forEach(exp => {
    const status = exp.company_id === admin.company_id ? '✅ WILL SHOW' : '❌ STILL HIDDEN';
    console.log(`- ID: ${exp.id}, Amount: $${exp.amount}, Status: ${status}`);
  });
  
  console.log('\n🎉 Fix completed! Refresh your browser to see the expenses.');
}

fixExpenseCompanyId().catch(console.error);
