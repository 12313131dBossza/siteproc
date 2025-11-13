require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testDashboardLogic() {
  console.log('\n=== TESTING DASHBOARD API LOGIC ===\n');
  
  const companyId = '0af17bea-44ab-4dfe-9fd0-75d6a2100857'; // TestCo
  
  console.log('1️⃣ Fetching projects with exact query from API...');
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, status, budget, actual_expenses, variance')
    .eq('company_id', companyId);
  
  console.log('   Projects:', projects?.length || 0);
  console.log('   Error:', projectsError);
  
  if (projects && projects.length > 0) {
    console.log('\n   Raw project data:');
    projects.forEach(p => {
      console.log('   ', JSON.stringify(p));
    });
    
    console.log('\n2️⃣ Calculating stats (same logic as API)...');
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (Number(p.actual_expenses) || 0), 0);
    
    console.log('   Total Budget:', totalBudget);
    console.log('   Total Spent:', totalSpent);
    
    console.log('\n3️⃣ Testing status filter...');
    const activeProjects = projects.filter((p) => {
      const status = typeof p.status === 'string' ? p.status.toLowerCase() : p.status;
      console.log('   Project status:', p.status, '-> lowercase:', status, '-> match:', status === 'active');
      return status === 'active';
    });
    console.log('   Active projects count:', activeProjects.length);
    
    console.log('\n4️⃣ Final stats object:');
    const stats = {
      projects: {
        total: projects.length,
        active: activeProjects.length,
        totalBudget: totalBudget,
        totalSpent: totalSpent,
      }
    };
    console.log('   ', JSON.stringify(stats, null, 2));
  } else {
    console.log('\n❌ No projects found!');
    console.log('   This is why dashboard shows 0');
  }
  
  console.log('\n5️⃣ Testing if service role bypasses RLS...');
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, company_id')
    .limit(5);
  console.log('   Total projects across all companies:', allProjects?.length || 0);
  if (allProjects && allProjects.length > 0) {
    console.log('   Companies found:', [...new Set(allProjects.map(p => p.company_id))]);
  }
}

testDashboardLogic();
