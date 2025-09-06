// User Assignment Script
// Run with: node assign-user.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE; // Service role key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignUserToCompany(email, companyName, role = 'member') {
  try {
    console.log(`\n🔍 Assigning ${email} to "${companyName}" as ${role}...`);

    // Find company by name
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('name', companyName);

    if (companyError) throw companyError;

    if (!companies || companies.length === 0) {
      console.error(`❌ Company "${companyName}" not found`);
      return false;
    }

    const company = companies[0];
    console.log(`✅ Found company: ${company.name} (${company.id})`);

    // Find user by email
    const { data: authUsers, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = authUsers.users.find(u => u.email === email);
    if (!user) {
      console.error(`❌ User "${email}" not found`);
      return false;
    }

    console.log(`✅ Found user: ${user.email} (${user.id})`);

    // Update user profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        company_id: company.id,
        role: role
      })
      .eq('id', user.id)
      .select('*, companies(name)');

    if (error) throw error;

    console.log(`✅ Successfully assigned ${email} to "${companyName}" as ${role}`);
    console.log('Updated profile:', data?.[0]);
    
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function listCompanies() {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, description')
      .order('name');

    if (error) throw error;

    console.log('\n📋 Available Companies:');
    companies?.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} (${company.description || 'No description'})`);
    });

    return companies;
  } catch (error) {
    console.error('❌ Error fetching companies:', error.message);
    return [];
  }
}

async function listUsers() {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        full_name,
        companies:company_id (name),
        users:id (email)
      `);

    if (error) throw error;

    console.log('\n👥 Current User Assignments:');
    users?.forEach((user, index) => {
      const email = user.users?.email || 'No email';
      const company = user.companies?.name || 'No company';
      console.log(`  ${index + 1}. ${email} - ${user.role} at "${company}"`);
    });

    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return [];
  }
}

// Main script
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'list-companies') {
    await listCompanies();
    return;
  }
  
  if (args[0] === 'list-users') {
    await listUsers();
    return;
  }
  
  if (args.length < 2) {
    console.log(`
📖 Usage:
  node assign-user.js <email> <company-name> [role]
  node assign-user.js list-companies
  node assign-user.js list-users

📝 Examples:
  node assign-user.js bossbcz@gmail.com "SiteProc Demo" member
  node assign-user.js admin@company.com "Construction Co" admin
  node assign-user.js viewer@company.com "Test Company" viewer

🎯 Available roles: admin, member, viewer, owner
    `);
    return;
  }

  const [email, companyName, role = 'member'] = args;
  await assignUserToCompany(email, companyName, role);
}

main().catch(console.error);
