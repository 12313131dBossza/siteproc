const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkExpenseIsolation() {
  console.log('=== CHECKING EXPENSE DATA ISOLATION ===\n');

  // Get all expenses
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, vendor, amount, company_id, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching expenses:', error);
    return;
  }

  console.log(`Total expenses found: ${expenses.length}\n`);

  // Group by company
  const byCompany = {};
  expenses.forEach(exp => {
    const cid = exp.company_id || 'NULL';
    if (!byCompany[cid]) byCompany[cid] = [];
    byCompany[cid].push(exp);
  });

  console.log('Expenses by company:');
  Object.keys(byCompany).forEach(cid => {
    console.log(`  Company ${cid}: ${byCompany[cid].length} expenses`);
  });

  // Check for NULL company_id
  const nullCompany = expenses.filter(e => !e.company_id);
  if (nullCompany.length > 0) {
    console.log(`\n⚠️  WARNING: ${nullCompany.length} expenses with NULL company_id!`);
    console.table(nullCompany.map(e => ({
      id: e.id,
      vendor: e.vendor,
      amount: e.amount,
      user_id: e.user_id ? e.user_id.substring(0, 8) + '...' : 'NULL'
    })));
  }

  // Show sample of expenses
  console.log('\nSample of recent expenses:');
  console.table(expenses.slice(0, 10).map(e => ({
    vendor: e.vendor,
    amount: e.amount,
    company_id: e.company_id ? e.company_id.substring(0, 8) + '...' : 'NULL',
    user_id: e.user_id ? e.user_id.substring(0, 8) + '...' : 'NULL'
  })));
}

checkExpenseIsolation().catch(console.error);
