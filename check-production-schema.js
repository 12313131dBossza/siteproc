const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://gjstirrsnkqxsbolsufn.supabase.co';
const PROD_SERVICE_KEY = process.env.PROD_SERVICE_KEY;

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSchema() {
  console.log('🔍 Checking production database schema...\n');
  
  // Try to get a project with all columns
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error fetching projects:', error.message);
    return;
  }
  
  if (projects && projects.length > 0) {
    console.log('✅ Found project. Available columns:');
    console.log(Object.keys(projects[0]).sort());
    console.log('\n📊 Sample project data:');
    console.log(projects[0]);
  } else {
    console.log('⚠️ No projects found in database');
  }
  
  // Check if actual_expenses or variance columns exist
  console.log('\n🔍 Testing specific columns...');
  
  const { data: test1, error: err1 } = await supabase
    .from('projects')
    .select('actual_expenses')
    .limit(1);
  
  console.log('actual_expenses column:', err1 ? `❌ ${err1.message}` : '✅ Exists');
  
  const { data: test2, error: err2 } = await supabase
    .from('projects')
    .select('variance')
    .limit(1);
  
  console.log('variance column:', err2 ? `❌ ${err2.message}` : '✅ Exists');
}

checkSchema();
