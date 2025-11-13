const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkWhichCompanyHasData() {
  console.log('=== FINDING COMPANIES WITH DATA ===\n');

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name');

  for (const company of companies) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('company_id', company.id);

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', company.id);

    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('company_id', company.id);

    const expCount = expenses?.length || 0;
    const projCount = projects?.length || 0;
    const orderCount = orders?.length || 0;
    const total = expCount + projCount + orderCount;

    if (total > 0) {
      console.log(`\n📊 Company: ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Projects: ${projCount}`);
      console.log(`   Orders: ${orderCount}`);
      console.log(`   Expenses: ${expCount}`);
      console.log(`   TOTAL: ${total} records`);
    }
  }

  // Check which company has the most data
  console.log('\n=== COMPANY WITH MOST EXPENSES ===\n');
  
  const { data: expensesByCompany } = await supabase
    .from('expenses')
    .select('company_id');

  const counts = {};
  expensesByCompany?.forEach(e => {
    counts[e.company_id] = (counts[e.company_id] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
  for (const [companyId, count] of sorted) {
    const company = companies.find(c => c.id === companyId);
    console.log(`${company?.name || 'Unknown'}: ${count} expenses`);
  }
}

checkWhichCompanyHasData().catch(console.error);
