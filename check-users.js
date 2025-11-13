const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCurrentUser() {
  console.log('=== CHECKING PROFILES & ROLES ===\n');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, role, company_id')
    .order('created_at', { ascending: false });

  console.log('All user profiles:');
  console.table(profiles.map(p => ({
    email: p.email,
    role: p.role,
    company_id: p.company_id ? p.company_id.substring(0, 12) + '...' : 'NULL'
  })));

  // Check companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name');

  console.log('\nCompanies:');
  console.table(companies.map(c => ({
    id: c.id.substring(0, 12) + '...',
    name: c.name
  })));
}

checkCurrentUser().catch(console.error);
