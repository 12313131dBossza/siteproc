// Company User Lookup Script
// Usage: node check-company-users.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vrkgtygzcokqoeeutvxd.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function showAllCompanies() {
  console.log('\n📋 ALL COMPANIES:');
  console.log('='.repeat(50));
  
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching companies:', error.message);
      return [];
    }
    
    if (!companies || companies.length === 0) {
      console.log('❌ No companies found');
      return [];
    }
    
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Created: ${new Date(company.created_at).toLocaleDateString()}`);
      console.log('');
    });
    
    return companies;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return [];
  }
}

async function getUsersByCompany(companyId = null, companyName = null) {
  console.log('\n👥 USERS BY COMPANY:');
  console.log('='.repeat(50));
  
  try {
    let query = supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        role, 
        company_id,
        companies(name)
      `);
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    } else if (companyName) {
      // First get company ID by name
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', `%${companyName}%`)
        .single();
      
      if (companies) {
        query = query.eq('company_id', companies.id);
      }
    }
    
    const { data: profiles, error } = await query.order('full_name');
    
    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    // Now get emails from auth system
    const { data: allUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }
    
    // Group by company
    const companiesMap = new Map();
    
    for (const profile of profiles) {
      const companyName = profile.companies?.name || 'No Company';
      const companyId = profile.company_id || 'none';
      
      if (!companiesMap.has(companyId)) {
        companiesMap.set(companyId, {
          name: companyName,
          users: []
        });
      }
      
      // Find email from auth users
      const authUser = allUsers.users.find(u => u.id === profile.id);
      const email = authUser?.email || 'Email not found';
      
      companiesMap.get(companyId).users.push({
        id: profile.id,
        email: email,
        full_name: profile.full_name || 'No name',
        role: profile.role || 'No role',
        created_at: authUser?.created_at
      });
    }
    
    // Display results
    for (const [companyId, company] of companiesMap) {
      console.log(`🏢 ${company.name.toUpperCase()}`);
      console.log(`   Company ID: ${companyId}`);
      console.log(`   Total Users: ${company.users.length}`);
      console.log('');
      
      company.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      Name: ${user.full_name}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      ID: ${user.id}`);
        if (user.created_at) {
          console.log(`      Joined: ${new Date(user.created_at).toLocaleDateString()}`);
        }
        console.log('');
      });
      
      console.log('-'.repeat(30));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function findUserCompany(email) {
  console.log(`\n🔍 FINDING COMPANY FOR: ${email}`);
  console.log('='.repeat(50));
  
  try {
    // Get user from auth system
    const { data: allUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }
    
    const authUser = allUsers.users.find(u => u.email === email);
    
    if (!authUser) {
      console.log('❌ User not found in auth system');
      return;
    }
    
    console.log('✅ User found in auth system:');
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Created: ${new Date(authUser.created_at).toLocaleDateString()}`);
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        role, 
        company_id,
        companies(name)
      `)
      .eq('id', authUser.id)
      .single();
    
    if (profileError) {
      console.log('⚠️  No profile found - user not assigned to company');
      return;
    }
    
    console.log('✅ Profile found:');
    console.log(`   Name: ${profile.full_name || 'Not set'}`);
    console.log(`   Role: ${profile.role || 'Not set'}`);
    console.log(`   Company: ${profile.companies?.name || 'No company assigned'}`);
    console.log(`   Company ID: ${profile.company_id || 'None'}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function showUsersByRole() {
  console.log('\n👑 USERS BY ROLE:');
  console.log('='.repeat(50));
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        role, 
        company_id,
        companies(name)
      `)
      .order('role');
    
    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }
    
    // Get all users from auth
    const { data: allUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }
    
    // Group by role
    const roleGroups = new Map();
    
    for (const profile of profiles) {
      const role = profile.role || 'no-role';
      
      if (!roleGroups.has(role)) {
        roleGroups.set(role, []);
      }
      
      const authUser = allUsers.users.find(u => u.id === profile.id);
      const email = authUser?.email || 'Email not found';
      
      roleGroups.get(role).push({
        email,
        full_name: profile.full_name || 'No name',
        company: profile.companies?.name || 'No company'
      });
    }
    
    // Display by role
    const roleOrder = ['owner', 'admin', 'manager', 'bookkeeper', 'member', 'viewer', 'no-role'];
    
    for (const role of roleOrder) {
      if (roleGroups.has(role)) {
        const users = roleGroups.get(role);
        console.log(`🎭 ${role.toUpperCase()} (${users.length} users):`);
        
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email}`);
          console.log(`      Name: ${user.full_name}`);
          console.log(`      Company: ${user.company}`);
          console.log('');
        });
        
        console.log('-'.repeat(30));
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🏢 COMPANY USER CHECKER\n');
    console.log('Usage:');
    console.log('  node check-company-users.js --all                    # Show all companies and users');
    console.log('  node check-company-users.js --company "Company Name" # Users in specific company');
    console.log('  node check-company-users.js --user email@domain.com  # Find user\'s company');
    console.log('  node check-company-users.js --roles                  # Show users by role');
    console.log('  node check-company-users.js --companies              # List all companies');
    console.log('\nExamples:');
    console.log('  node check-company-users.js --user bossbcz@gmail.com');
    console.log('  node check-company-users.js --company "SiteProc Demo"');
    return;
  }
  
  const command = args[0];
  const value = args[1];
  
  switch (command) {
    case '--all':
      await showAllCompanies();
      await getUsersByCompany();
      break;
      
    case '--companies':
      await showAllCompanies();
      break;
      
    case '--company':
      if (!value) {
        console.error('❌ Company name required');
        return;
      }
      await getUsersByCompany(null, value);
      break;
      
    case '--user':
      if (!value) {
        console.error('❌ Email required');
        return;
      }
      await findUserCompany(value);
      break;
      
    case '--roles':
      await showUsersByRole();
      break;
      
    default:
      console.error('❌ Unknown command:', command);
      console.log('Run without arguments to see usage');
  }
}

main().catch(console.error);
