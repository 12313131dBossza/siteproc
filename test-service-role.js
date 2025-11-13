const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

console.log('\n=== TESTING SERVICE ROLE ACCESS ===\n');
console.log('Has URL:', !!supabaseUrl);
console.log('Has Service Key:', !!serviceKey);
console.log('Service Key Preview:', serviceKey?.substring(0, 30) + '...\n');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testServiceRole() {
  const companyId = 'b019b7b2-32f6-42c0-a404-01db30872cfd';
  
  console.log('Testing query with service role key...\n');
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success! Found', data.length, 'projects');
    if (data.length > 0) {
      console.log('\nProjects:');
      data.forEach(p => console.log(`  - ${p.name} (Budget: $${p.budget})`));
    }
  }
}

testServiceRole();
