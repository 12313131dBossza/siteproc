require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkWhatExists() {
  console.log('\n=== CHECKING WHAT EXISTS IN DATABASE ===\n');
  
  console.log('1️⃣ All companies:');
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('created_at', { ascending: false });
  
  companies?.forEach(c => {
    console.log(`   ${c.name} (${c.id})`);
  });
  
  console.log('\n2️⃣ All users:');
  const { data: users } = await supabase
    .from('profiles')
    .select('email, company_id, companies(name)')
    .order('created_at', { ascending: false })
    .limit(10);
  
  users?.forEach(u => {
    console.log(`   ${u.email} -> ${u.companies?.name} (${u.company_id})`);
  });
  
  console.log('\n3️⃣ Projects by company:');
  const { data: projectCounts } = await supabase
    .from('projects')
    .select('company_id, companies(name)');
  
  const counts = {};
  projectCounts?.forEach(p => {
    const companyName = p.companies?.name || 'Unknown';
    counts[companyName] = (counts[companyName] || 0) + 1;
  });
  
  Object.entries(counts).forEach(([name, count]) => {
    console.log(`   ${name}: ${count} projects`);
  });
  
  console.log('\n4️⃣ Looking for user chayaponyaibandit@gmail.com:');
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('email', 'chayaponyaibandit@gmail.com')
    .single();
  
  if (profile) {
    console.log('   ✅ Found:', profile.email);
    console.log('   Company:', profile.companies?.name);
    console.log('   Company ID:', profile.company_id);
    
    const { data: userProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', profile.company_id);
    
    console.log('   Projects:', userProjects?.length || 0);
    userProjects?.forEach(p => {
      console.log(`     - ${p.code}: ${p.name} ($${parseFloat(p.budget).toLocaleString()})`);
    });
  } else {
    console.log('   ❌ Not found in this database');
  }
}

checkWhatExists();
