const { createClient } = require('@supabase/supabase-js');

// Production Supabase (from Vercel)
const prodUrl = 'https://gjstirrsnkqxsbolsufn.supabase.co';
const prodKey = process.env.SUPABASE_SERVICE_ROLE; // Will use from .env.local

async function checkProductionDatabase() {
  console.log('\n=== CHECKING PRODUCTION SUPABASE DATABASE ===\n');
  console.log('Production URL:', prodUrl);
  
  if (!prodKey) {
    console.log('\n❌ Please set SUPABASE_SERVICE_ROLE in .env.local');
    console.log('Get it from https://gjstirrsnkqxsbolsufn.supabase.co dashboard');
    return;
  }
  
  const supabase = createClient(prodUrl, prodKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Check for TestCo company
  console.log('Looking for TestCo company...');
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'TestCo');
  
  if (!companies || companies.length === 0) {
    console.log('❌ TestCo company does NOT exist in production database');
    console.log('   Need to check which companies exist there');
    
    const { data: allCompanies } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('\nCompanies in production database:');
    allCompanies?.forEach(c => console.log(`  - ${c.name} (${c.id})`));
    
    return;
  }
  
  const testcoId = companies[0].id;
  console.log('✅ TestCo found:', testcoId);
  
  // Check for user
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, company_id')
    .eq('email', 'chayaponyaibandit@gmail.com')
    .single();
  
  if (!profile) {
    console.log('❌ User chayaponyaibandit@gmail.com does NOT exist in production');
  } else {
    console.log('✅ User found, company:', profile.company_id);
  }
  
  // Check for data
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', testcoId);
  
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('company_id', testcoId);
  
  console.log('\nTestCo Data in Production:');
  console.log('  Projects:', projects?.length || 0);
  console.log('  Expenses:', expenses?.length || 0);
  
  if (projects && projects.length > 0) {
    console.log('\n✅ Data exists! Projects:');
    projects.forEach(p => console.log(`    - ${p.code}: ${p.name}`));
  }
}

checkProductionDatabase();
