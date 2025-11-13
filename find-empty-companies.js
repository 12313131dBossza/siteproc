const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findEmptyCompanies() {
  console.log('\n=== FINDING COMPANIES WITH NO DATA ===\n');

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  for (const company of companies || []) {
    const [projects, expenses, payments] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact' }).eq('company_id', company.id),
      supabase.from('expenses').select('*', { count: 'exact' }).eq('company_id', company.id),
      supabase.from('payments').select('*', { count: 'exact' }).eq('company_id', company.id),
    ]);

    const totalData = (projects.count || 0) + (expenses.count || 0) + (payments.count || 0);
    
    if (totalData === 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', company.id);
      
      console.log(`❌ EMPTY: ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Users: ${users?.map(u => u.email).join(', ') || 'none'}`);
      console.log(`   Created: ${company.created_at}\n`);
    }
  }
}

findEmptyCompanies();
