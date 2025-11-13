// MANUAL SETUP - Create everything from scratch
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://gjstirrsnkqxsbolsufn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3RpcnJzbmtxeHNib2xzdWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDk4MTI0NSwiZXhwIjoyMDQ2NTU3MjQ1fQ.FrWb4V0Q-Q5u2WtT-K8ZLfQNO8Mg2oQ3jDRz1fB1pBU';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY, {
  auth: { 
    autoRefreshToken: false, 
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function setupEverything() {
  console.log('\n=== COMPLETE SETUP FOR PRODUCTION ===\n');
  
  try {
    // Step 1: Create or get TestCo company
    console.log('1️⃣ Setting up TestCo company...');
    let { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'TestCo')
      .single();
    
    if (!company) {
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({ name: 'TestCo' })
        .select()
        .single();
      
      if (error) throw error;
      company = newCompany;
    }
    
    console.log(`   ✅ TestCo company: ${company.id}`);
    
    // Step 2: Create auth user + profile manually
    console.log('\n2️⃣ Creating user account...');
    
    const email = 'chayaponyaibandit@gmail.com';
    const password = 'TestPassword123!'; // Use this password to login
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'TestCo Admin'
      }
    });
    
    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }
    
    const userId = authData?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id;
    
    if (!userId) {
      throw new Error('Could not create or find user');
    }
    
    console.log(`   ✅ Auth user created: ${userId}`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Password: ${password}`);
    
    // Step 3: Create profile
    console.log('\n3️⃣ Creating profile...');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        company_id: company.id,
        role: 'admin',
        username: email.split('@')[0]
      }, {
        onConflict: 'id'
      });
    
    if (profileError) throw profileError;
    console.log('   ✅ Profile created');
    
    // Step 4: Create projects
    console.log('\n4️⃣ Creating projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .upsert([
        {
          company_id: company.id,
          created_by: userId,
          code: 'PROD-DOR-001',
          name: 'Downtown Office Renovation',
          budget: 150000,
          status: 'active',
          actual_expenses: 0
        },
        {
          company_id: company.id,
          created_by: userId,
          code: 'PROD-RES-002',
          name: 'Residential Complex - Phase 1',
          budget: 500000,
          status: 'active',
          actual_expenses: 0
        },
        {
          company_id: company.id,
          created_by: userId,
          code: 'PROD-SML-003',
          name: 'Shopping Mall Expansion',
          budget: 2000000,
          status: 'active',
          actual_expenses: 0
        }
      ], {
        onConflict: 'code',
        ignoreDuplicates: false
      })
      .select();
    
    if (projectsError) throw projectsError;
    console.log(`   ✅ Created ${projects.length} projects`);
    
    // Step 5: Create expenses
    console.log('\n5️⃣ Creating expenses...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .insert([
        { company_id: company.id, project_id: projects[0].id, user_id: userId, vendor: 'ABC Construction', category: 'labor', amount: 25500, description: 'Labor Week 1-2', status: 'approved', spent_at: '2024-11-02' },
        { company_id: company.id, project_id: projects[0].id, user_id: userId, vendor: 'BuildMart', category: 'materials', amount: 8750, description: 'Cement', status: 'approved', spent_at: '2024-11-06' },
        { company_id: company.id, project_id: projects[1].id, user_id: userId, vendor: 'Metro Steel', category: 'materials', amount: 46000, description: 'Steel rebar', status: 'approved', spent_at: '2024-11-11' },
        { company_id: company.id, project_id: projects[0].id, user_id: userId, vendor: 'Home Depot', category: 'materials', amount: 3350, description: 'Paint', status: 'approved', spent_at: '2024-11-16' },
        { company_id: company.id, project_id: projects[1].id, user_id: userId, vendor: 'United Rentals', category: 'equipment', amount: 4650, description: 'Excavator', status: 'approved', spent_at: '2024-11-19' },
        { company_id: company.id, project_id: projects[0].id, user_id: userId, vendor: 'United Rentals', category: 'equipment', amount: 2900, description: 'Scaffolding', status: 'approved', spent_at: '2024-11-21' },
        { company_id: company.id, project_id: projects[1].id, user_id: userId, vendor: 'FastFreight', category: 'transportation', amount: 1350, description: 'Delivery', status: 'approved', spent_at: '2024-11-23' },
        { company_id: company.id, project_id: projects[0].id, user_id: userId, vendor: 'Office Supplies', category: 'office', amount: 475, description: 'Office supplies', status: 'pending', spent_at: '2024-11-26' },
        { company_id: company.id, project_id: projects[1].id, user_id: userId, vendor: 'PowerPro Electric', category: 'materials', amount: 13000, description: 'Electrical', status: 'pending', spent_at: '2024-11-29' },
        { company_id: company.id, project_id: projects[2].id, user_id: userId, vendor: 'Design Architects', category: 'professional services', amount: 15500, description: 'Architecture', status: 'pending', spent_at: '2024-12-02' }
      ])
      .select();
    
    if (expensesError) throw expensesError;
    console.log(`   ✅ Created ${expenses.length} expenses`);
    
    // Step 6: Create payments
    console.log('\n6️⃣ Creating payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert([
        { company_id: company.id, project_id: projects[0].id, vendor_name: 'ABC Construction', amount: 16000, payment_date: '2024-11-05', payment_method: 'Bank Transfer', status: 'paid' },
        { company_id: company.id, project_id: projects[1].id, vendor_name: 'Metro Steel', amount: 51000, payment_date: '2024-11-15', payment_method: 'Check', status: 'paid' },
        { company_id: company.id, project_id: projects[0].id, vendor_name: 'BuildMart', amount: 9000, payment_date: '2024-11-20', payment_method: 'Wire Transfer', status: 'paid' },
        { company_id: company.id, project_id: projects[1].id, vendor_name: 'United Rentals', amount: 26000, payment_date: '2024-12-01', payment_method: 'Bank Transfer', status: 'unpaid' },
        { company_id: company.id, project_id: projects[2].id, vendor_name: 'Design Architects', amount: 16000, payment_date: '2024-12-05', payment_method: 'Check', status: 'unpaid' }
      ])
      .select();
    
    if (paymentsError) throw paymentsError;
    console.log(`   ✅ Created ${payments.length} payments`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Everything is set up!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Company: TestCo (${company.id})`);
    console.log(`   User: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Projects: ${projects.length} - Budget: $${projects.reduce((s, p) => s + p.budget, 0).toLocaleString()}`);
    console.log(`   Expenses: ${expenses.length} - Total: $${expenses.reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString()}`);
    console.log(`   Payments: ${payments.length} - Total: $${payments.reduce((s, p) => s + parseFloat(p.amount), 0).toLocaleString()}`);
    console.log('\n🚀 Next Steps:');
    console.log('   1. Go to your production site');
    console.log(`   2. Login with: ${email}`);
    console.log(`   3. Password: ${password}`);
    console.log('   4. View the dashboard - you should see 3 projects!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.details) console.error('   Details:', error.details);
    if (error.hint) console.error('   Hint:', error.hint);
  }
}

setupEverything();
