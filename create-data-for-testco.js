const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createDataForTestCo() {
  console.log('\n=== CREATING MOCK DATA FOR TESTCO ===\n');

  const companyId = '0af17bea-44ab-4dfe-9fd0-75d6a2100857'; // TestCo
  const userEmail = 'chayaponyaibandit@gmail.com';

  // Get user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', userEmail)
    .limit(1);

  const userId = profiles?.[0]?.id;
  
  if (!userId) {
    console.error('❌ User not found:', userEmail);
    return;
  }

  console.log(`Creating data for: TestCo`);
  console.log(`User: ${userEmail}\n`);

  try {
    // 1. CREATE PROJECTS
    console.log('📁 Creating projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .insert([
        {
          company_id: companyId,
          created_by: userId,
          name: 'Downtown Office Renovation',
          code: 'TESTCO-DOR-001',
          status: 'active',
          budget: 150000
        },
        {
          company_id: companyId,
          created_by: userId,
          name: 'Residential Complex - Phase 1',
          code: 'TESTCO-RES-002',
          status: 'active',
          budget: 500000
        },
        {
          company_id: companyId,
          created_by: userId,
          name: 'Shopping Mall Expansion',
          code: 'TESTCO-SML-003',
          status: 'active',
          budget: 2000000
        }
      ])
      .select();

    if (projectsError) throw projectsError;
    console.log(`✅ Created ${projects.length} projects\n`);

    // 2. CREATE EXPENSES
    console.log('💰 Creating expenses...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .insert([
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'ABC Construction Crew',
          category: 'labor',
          amount: 25500,
          description: 'Week 1-2 labor costs - TestCo',
          status: 'approved',
          spent_at: '2024-11-02'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'BuildMart Supplies',
          category: 'materials',
          amount: 8750,
          description: 'Cement and concrete supplies - TestCo',
          status: 'approved',
          spent_at: '2024-11-06'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'Metro Steel Co.',
          category: 'materials',
          amount: 46000,
          description: 'Steel rebar for foundation - TestCo',
          status: 'approved',
          spent_at: '2024-11-11'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'Home Depot',
          category: 'materials',
          amount: 3350,
          description: 'Paint and finishing supplies - TestCo',
          status: 'approved',
          spent_at: '2024-11-16'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'United Rentals',
          category: 'equipment',
          amount: 4650,
          description: 'Excavator rental - TestCo',
          status: 'approved',
          spent_at: '2024-11-19'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'United Rentals',
          category: 'equipment',
          amount: 2900,
          description: 'Scaffolding rental - TestCo',
          status: 'approved',
          spent_at: '2024-11-21'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'FastFreight Logistics',
          category: 'transportation',
          amount: 1350,
          description: 'Material delivery - TestCo',
          status: 'approved',
          spent_at: '2024-11-23'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'Office Supplies Co',
          category: 'office',
          amount: 475,
          description: 'Office supplies - TestCo',
          status: 'pending',
          spent_at: '2024-11-26'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'PowerPro Electric',
          category: 'materials',
          amount: 13000,
          description: 'Electrical wiring and fixtures - TestCo',
          status: 'pending',
          spent_at: '2024-11-29'
        },
        {
          company_id: companyId,
          project_id: projects[2].id,
          user_id: userId,
          vendor: 'Design Architects Inc',
          category: 'professional services',
          amount: 15500,
          description: 'Architectural planning and design - TestCo',
          status: 'pending',
          spent_at: '2024-12-02'
        }
      ])
      .select();

    if (expensesError) throw expensesError;
    console.log(`✅ Created ${expenses.length} expenses\n`);

    // 3. CREATE PAYMENTS
    console.log('💵 Creating payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert([
        {
          company_id: companyId,
          project_id: projects[0].id,
          vendor_name: 'ABC Construction Crew',
          amount: 15000,
          payment_date: '2024-11-05',
          payment_method: 'Bank Transfer',
          status: 'paid'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          vendor_name: 'Metro Steel Co.',
          amount: 50000,
          payment_date: '2024-11-15',
          payment_method: 'Check',
          status: 'paid'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          vendor_name: 'BuildMart Supplies',
          amount: 8500,
          payment_date: '2024-11-20',
          payment_method: 'Wire Transfer',
          status: 'paid'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          vendor_name: 'United Rentals',
          amount: 25000,
          payment_date: '2024-12-01',
          payment_method: 'Bank Transfer',
          status: 'unpaid'
        },
        {
          company_id: companyId,
          project_id: projects[2].id,
          vendor_name: 'Design Architects Inc',
          amount: 15000,
          payment_date: '2024-12-05',
          payment_method: 'Check',
          status: 'unpaid'
        }
      ])
      .select();

    if (paymentsError) throw paymentsError;
    console.log(`✅ Created ${payments.length} payments\n`);

    console.log('=' .repeat(50));
    console.log('✅ MOCK DATA CREATED SUCCESSFULLY FOR TESTCO!\n');
    console.log('Summary:');
    console.log(`  • ${projects.length} projects`);
    console.log(`  • ${expenses.length} expenses (Total: $${expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toLocaleString()})`);
    console.log(`  • ${payments.length} payments (Total: $${payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()})`);
    console.log('\n🎉 Refresh your dashboard to see the data!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.details) console.error('   Details:', error.details);
  }
}

createDataForTestCo();
