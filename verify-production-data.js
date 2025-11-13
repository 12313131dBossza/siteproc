require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkProductionData() {
  console.log('\n=== PRODUCTION TESTCO DATA ===\n');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, company_id')
    .eq('email', 'chayaponyaibandit@gmail.com')
    .single();
  
  console.log('User:', profile.email);
  console.log('Company ID:', profile.company_id);
  
  const { data: projects } = await supabase
    .from('projects')
    .select('id, code, name, budget, status')
    .eq('company_id', profile.company_id);
  
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, category, amount, status')
    .eq('company_id', profile.company_id);
  
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, status')
    .eq('company_id', profile.company_id);
  
  console.log('\n✅ Projects:', projects?.length || 0);
  projects?.forEach(p => 
    console.log('   -', p.code, p.name, '- $' + parseFloat(p.budget).toLocaleString())
  );
  
  const totalExpenses = expenses?.reduce((s, e) => s + parseFloat(e.amount || 0), 0) || 0;
  const totalPayments = payments?.reduce((s, p) => s + parseFloat(p.amount || 0), 0) || 0;
  
  console.log('\n✅ Expenses:', expenses?.length || 0, '- Total: $' + totalExpenses.toLocaleString());
  console.log('✅ Payments:', payments?.length || 0, '- Total: $' + totalPayments.toLocaleString());
  
  console.log('\n🎯 Data is ready in production!');
  console.log('\nNow open your production site and:');
  console.log('1. Make sure you\'re logged in as chayaponyaibandit@gmail.com');
  console.log('2. Go to the dashboard');
  console.log('3. Open browser console (F12)');
  console.log('4. Hard refresh (Ctrl+Shift+R)');
  console.log('5. Check the console logs for [Dashboard API]');
}

checkProductionData();
