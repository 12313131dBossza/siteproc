// ADD TESTCO DATA TO PRODUCTION DATABASE (gjstirrsnkqxsbolsufn)
// This script will create TestCo company and all data in the production database

const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE (gjstirrsnkqxsbolsufn)
const PROD_URL = 'https://gjstirrsnkqxsbolsufn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3RpcnJzbmtxeHNib2xzdWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzUwOTcsImV4cCI6MjA3MTM1MTA5N30.JQjSPd3e97tmGJC0I8lAzS2wJocAuozi9sYrzlXM2xY'; // Get from Supabase dashboard

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addTestCoToProduction() {
  console.log('\n=== ADDING TESTCO DATA TO PRODUCTION DATABASE ===\n');
  console.log('Database:', PROD_URL);
  
  try {
    // Step 1: Check if TestCo company exists
    console.log('1️⃣ Checking for TestCo company...');
    let { data: testco } = await supabase
      .from('companies')
      .select('id, name')
      .eq('name', 'TestCo')
      .single();
    
    let testcoId;
    
    if (!testco) {
      console.log('   Creating TestCo company...');
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({ name: 'TestCo' })
        .select()
        .single();
      
      if (companyError) throw companyError;
      testcoId = newCompany.id;
      console.log('   ✅ Created TestCo:', testcoId);
    } else {
      testcoId = testco.id;
      console.log('   ✅ TestCo exists:', testcoId);
    }
    
    // Step 2: Check if user exists
    console.log('\n2️⃣ Checking for user chayaponyaibandit@gmail.com...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, company_id')
      .eq('email', 'chayaponyaibandit@gmail.com')
      .single();
    
    if (!profile) {
      console.log('   ❌ User does not exist in production database');
      console.log('   The user will need to sign up on production first');
      console.log('   Or we can create the profile manually if you have the user ID');
      return;
    }
    
    const userId = profile.id;
    console.log('   ✅ User exists:', userId);
    console.log('   Current company:', profile.company_id);
    
    // Step 3: Update user's company to TestCo if needed
    if (profile.company_id !== testcoId) {
      console.log('\n3️⃣ Updating user company to TestCo...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ company_id: testcoId })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      console.log('   ✅ User company updated to TestCo');
    } else {
      console.log('\n3️⃣ User already belongs to TestCo ✅');
    }
    
    // Step 4: Create projects
    console.log('\n4️⃣ Creating projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .insert([
        {
          company_id: testcoId,
          created_by: userId,
          code: 'TESTCO-DOR-001',
          name: 'Downtown Office Renovation',
          budget: 150000,
          status: 'active',
          actual_expenses: 0,
          variance: 0
        },
        {
          company_id: testcoId,
          created_by: userId,
          code: 'TESTCO-RES-002',
          name: 'Residential Complex - Phase 1',
          budget: 500000,
          status: 'active',
          actual_expenses: 0,
          variance: 0
        },
        {
          company_id: testcoId,
          created_by: userId,
          code: 'TESTCO-SML-003',
          name: 'Shopping Mall Expansion',
          budget: 2000000,
          status: 'active',
          actual_expenses: 0,
          variance: 0
        }
      ])
      .select();
    
    if (projectsError) throw projectsError;
    console.log(`   ✅ Created ${projects.length} projects`);
    
    // Step 5: Create expenses
    console.log('\n5️⃣ Creating expenses...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .insert([
        { company_id: testcoId, project_id: projects[0].id, user_id: userId, vendor: 'ABC Construction Crew', category: 'labor', amount: 25500, description: 'Week 1-2 labor costs - TestCo', status: 'approved', spent_at: '2024-11-02' },
        { company_id: testcoId, project_id: projects[0].id, user_id: userId, vendor: 'BuildMart Supplies', category: 'materials', amount: 8750, description: 'Cement and concrete - TestCo', status: 'approved', spent_at: '2024-11-06' },
        { company_id: testcoId, project_id: projects[1].id, user_id: userId, vendor: 'Metro Steel Co.', category: 'materials', amount: 46000, description: 'Steel rebar - TestCo', status: 'approved', spent_at: '2024-11-11' },
        { company_id: testcoId, project_id: projects[0].id, user_id: userId, vendor: 'Home Depot', category: 'materials', amount: 3350, description: 'Paint supplies - TestCo', status: 'approved', spent_at: '2024-11-16' },
        { company_id: testcoId, project_id: projects[1].id, user_id: userId, vendor: 'United Rentals', category: 'equipment', amount: 4650, description: 'Excavator rental - TestCo', status: 'approved', spent_at: '2024-11-19' },
        { company_id: testcoId, project_id: projects[0].id, user_id: userId, vendor: 'United Rentals', category: 'equipment', amount: 2900, description: 'Scaffolding rental - TestCo', status: 'approved', spent_at: '2024-11-21' },
        { company_id: testcoId, project_id: projects[1].id, user_id: userId, vendor: 'FastFreight Logistics', category: 'transportation', amount: 1350, description: 'Material delivery - TestCo', status: 'approved', spent_at: '2024-11-23' },
        { company_id: testcoId, project_id: projects[0].id, user_id: userId, vendor: 'Office Supplies Co', category: 'office', amount: 475, description: 'Office supplies - TestCo', status: 'pending', spent_at: '2024-11-26' },
        { company_id: testcoId, project_id: projects[1].id, user_id: userId, vendor: 'PowerPro Electric', category: 'materials', amount: 13000, description: 'Electrical - TestCo', status: 'pending', spent_at: '2024-11-29' },
        { company_id: testcoId, project_id: projects[2].id, user_id: userId, vendor: 'Design Architects Inc', category: 'professional services', amount: 15500, description: 'Architecture - TestCo', status: 'pending', spent_at: '2024-12-02' }
      ])
      .select();
    
    if (expensesError) throw expensesError;
    console.log(`   ✅ Created ${expenses.length} expenses`);
    
    // Step 6: Create payments
    console.log('\n6️⃣ Creating payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert([
        { company_id: testcoId, project_id: projects[0].id, vendor_name: 'ABC Construction Crew', amount: 16000, payment_date: '2024-11-05', payment_method: 'Bank Transfer', status: 'paid' },
        { company_id: testcoId, project_id: projects[1].id, vendor_name: 'Metro Steel Co.', amount: 51000, payment_date: '2024-11-15', payment_method: 'Check', status: 'paid' },
        { company_id: testcoId, project_id: projects[0].id, vendor_name: 'BuildMart Supplies', amount: 9000, payment_date: '2024-11-20', payment_method: 'Wire Transfer', status: 'paid' },
        { company_id: testcoId, project_id: projects[1].id, vendor_name: 'United Rentals', amount: 26000, payment_date: '2024-12-01', payment_method: 'Bank Transfer', status: 'unpaid' },
        { company_id: testcoId, project_id: projects[2].id, vendor_name: 'Design Architects Inc', amount: 16000, payment_date: '2024-12-05', payment_method: 'Check', status: 'unpaid' }
      ])
      .select();
    
    if (paymentsError) throw paymentsError;
    console.log(`   ✅ Created ${payments.length} payments`);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ SUCCESS! TestCo data added to production database!');
    console.log('='.repeat(50));
    console.log('\nSummary:');
    console.log(`  Company: TestCo (${testcoId})`);
    console.log(`  Projects: ${projects.length} - Total Budget: $${projects.reduce((s, p) => s + p.budget, 0).toLocaleString()}`);
    console.log(`  Expenses: ${expenses.length} - Total: $${expenses.reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString()}`);
    console.log(`  Payments: ${payments.length} - Total: $${payments.reduce((s, p) => s + parseFloat(p.amount), 0).toLocaleString()}`);
    console.log('\n🎉 You can now log in and see the dashboard with data!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.code) console.error('Code:', error.code);
  }
}

addTestCoToProduction();
