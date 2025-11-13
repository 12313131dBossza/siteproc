require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testRLSAccess() {
  console.log('\n=== TESTING RLS ACCESS ===\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;
  
  // Test 1: Service role (bypasses RLS)
  console.log('1️⃣ Testing with SERVICE ROLE (bypasses RLS)...');
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { data: adminProjects, error: adminError } = await supabaseAdmin
    .from('projects')
    .select('id, code, name, company_id')
    .eq('company_id', '0af17bea-44ab-4dfe-9fd0-75d6a2100857');
  
  console.log('   Projects found:', adminProjects?.length || 0);
  if (adminError) console.log('   Error:', adminError);
  
  // Test 2: Anon key (uses RLS)
  console.log('\n2️⃣ Testing with ANON KEY (uses RLS, no auth)...');
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: anonProjects, error: anonError } = await supabaseAnon
    .from('projects')
    .select('id, code, name, company_id')
    .eq('company_id', '0af17bea-44ab-4dfe-9fd0-75d6a2100857');
  
  console.log('   Projects found:', anonProjects?.length || 0);
  if (anonError) console.log('   Error:', anonError);
  
  // Test 3: Check RLS policies
  console.log('\n3️⃣ Checking RLS policies on projects table...');
  const { data: rlsEnabled, error: rlsError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .limit(0);
  
  console.log('   RLS check error:', rlsError || 'None');
  
  // Test 4: Check user's profile
  console.log('\n4️⃣ Checking user profile...');
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, company_id, role')
    .eq('email', 'chayaponyaibandit@gmail.com')
    .single();
  
  console.log('   User:', profile?.email);
  console.log('   Company ID:', profile?.company_id);
  console.log('   Role:', profile?.role);
  console.log('   User ID:', profile?.id);
  
  if (profileError) console.log('   Error:', profileError);
  
  // Test 5: Try authenticated access
  console.log('\n5️⃣ Testing what RLS policies exist...');
  const { data: policies } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      SELECT tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'projects';
    `
  }).catch(() => ({ data: null }));
  
  if (policies) {
    console.log('   Policies:', JSON.stringify(policies, null, 2));
  } else {
    console.log('   Could not fetch policies (exec_sql not available)');
    
    // Alternative: Check if RLS is enabled
    const { data: tables } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'projects';
      `
    }).catch(() => ({ data: null }));
    
    if (tables) {
      console.log('   RLS status:', tables);
    }
  }
  
  console.log('\n=== DIAGNOSIS ===');
  if (adminProjects?.length > 0 && (!anonProjects || anonProjects.length === 0)) {
    console.log('⚠️  SERVICE ROLE can see data, but ANON KEY cannot');
    console.log('⚠️  This means RLS policies are blocking unauthenticated access');
    console.log('⚠️  The dashboard API needs to use SERVICE ROLE or fix RLS policies');
  } else if (adminProjects?.length > 0 && anonProjects?.length > 0) {
    console.log('✅ Both SERVICE ROLE and ANON KEY can see data');
    console.log('✅ RLS policies allow access');
  } else {
    console.log('❌ Neither can see data - check if data exists');
  }
}

testRLSAccess();
