const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkPolicies() {
  console.log('\n=== CHECKING RLS POLICIES ===\n');

  // Check projects table policies
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname, 
          tablename, 
          policyname, 
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename IN ('projects', 'expenses', 'payments')
        ORDER BY tablename, policyname;
      `
    });

  if (error) {
    console.error('Error fetching policies:', error);
    
    // Try alternative approach
    console.log('\nTrying direct query...\n');
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, code, company_id, status')
      .eq('company_id', '0af17bea-44ab-4dfe-9fd0-75d6a2100857')
      .limit(5);
    
    console.log('TestCo Projects (Service Role):', projects);
    
    return;
  }

  console.log('Policies:', data);
}

checkPolicies();
