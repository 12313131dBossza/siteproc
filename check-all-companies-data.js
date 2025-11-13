const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAllCompaniesData() {
  console.log('\n=== CHECKING ALL COMPANIES DATA ===\n');

  // Get all companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  for (const company of companies || []) {
    const [projects, expenses, payments, profiles] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact' }).eq('company_id', company.id),
      supabase.from('expenses').select('*', { count: 'exact' }).eq('company_id', company.id),
      supabase.from('payments').select('*', { count: 'exact' }).eq('company_id', company.id),
      supabase.from('profiles').select('email', { count: 'exact' }).eq('company_id', company.id),
    ]);

    const totalData = (projects.count || 0) + (expenses.count || 0) + (payments.count || 0);
    
    if (totalData > 0) {
      console.log(`\n📊 ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Users: ${profiles.count || 0} (${profiles.data?.map(p => p.email).join(', ') || 'none'})`);
      console.log(`   Projects: ${projects.count || 0}`);
      console.log(`   Expenses: ${expenses.count || 0}`);
      console.log(`   Payments: ${payments.count || 0}`);
      
      if (projects.data && projects.data.length > 0) {
        console.log(`   First Project: "${projects.data[0].name}" (Budget: $${projects.data[0].budget})`);
      }
    }
  }

  console.log('\n');
}

checkAllCompaniesData();
