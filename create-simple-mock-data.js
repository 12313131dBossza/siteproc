const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createMockData() {
  console.log('\n=== CREATING MOCK DATA FOR YOUR COMPANY ===\n');

  // Get the most recent company
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!companies || companies.length === 0) {
    console.error('❌ No companies found');
    return;
  }

  const companyId = companies[0].id;
  const companyName = companies[0].name;

  console.log(`Creating data for: ${companyName}`);
  console.log(`Company ID: ${companyId}\n`);

  // Get a user from this company
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('company_id', companyId)
    .limit(1);

  const userId = profiles?.[0]?.id || null;
  console.log(`Using user: ${profiles?.[0]?.email || 'none'}\n`);

  try {
    // 1. CREATE PROJECTS
    console.log('📁 Creating projects...');
    const { data: projects, error: projectsError} = await supabase
      .from('projects')
      .insert([
        {
          company_id: companyId,
          created_by: userId,
          name: 'Downtown Office Renovation',
          code: 'DOR-2024-001',
          status: 'active',
          budget: 150000
        },
        {
          company_id: companyId,
          created_by: userId,
          name: 'Residential Complex - Phase 1',
          code: 'RES-2024-002',
          status: 'active',
          budget: 500000
        },
        {
          company_id: companyId,
          created_by: userId,
          name: 'Shopping Mall Expansion',
          code: 'SML-2024-003',
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
          amount: 25000,
          description: 'Week 1-2 labor costs',
          status: 'approved',
          spent_at: '2024-11-01'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'BuildMart Supplies',
          category: 'materials',
          amount: 8500,
          description: 'Cement and concrete supplies',
          status: 'approved',
          spent_at: '2024-11-05'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'Metro Steel Co.',
          category: 'materials',
          amount: 45000,
          description: 'Steel rebar for foundation',
          status: 'approved',
          spent_at: '2024-11-10'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'Home Depot',
          category: 'materials',
          amount: 3200,
          description: 'Paint and finishing supplies',
          status: 'approved',
          spent_at: '2024-11-15'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'United Rentals',
          category: 'equipment',
          amount: 4500,
          description: 'Excavator rental',
          status: 'approved',
          spent_at: '2024-11-18'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'United Rentals',
          category: 'equipment',
          amount: 2800,
          description: 'Scaffolding rental',
          status: 'approved',
          spent_at: '2024-11-20'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'FastFreight Logistics',
          category: 'transportation',
          amount: 1200,
          description: 'Material delivery',
          status: 'approved',
          spent_at: '2024-11-22'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          user_id: userId,
          vendor: 'Office Supplies Co',
          category: 'office',
          amount: 450,
          description: 'Office supplies',
          status: 'pending',
          spent_at: '2024-11-25'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          user_id: userId,
          vendor: 'PowerPro Electric',
          category: 'materials',
          amount: 12500,
          description: 'Electrical wiring and fixtures',
          status: 'pending',
          spent_at: '2024-11-28'
        },
        {
          company_id: companyId,
          project_id: projects[2].id,
          user_id: userId,
          vendor: 'Design Architects Inc',
          category: 'professional services',
          amount: 15000,
          description: 'Architectural planning and design',
          status: 'pending',
          spent_at: '2024-12-01'
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
          status: 'completed'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          vendor_name: 'Metro Steel Co.',
          amount: 50000,
          payment_date: '2024-11-15',
          payment_method: 'Check',
          status: 'completed'
        },
        {
          company_id: companyId,
          project_id: projects[0].id,
          vendor_name: 'BuildMart Supplies',
          amount: 8500,
          payment_date: '2024-11-20',
          payment_method: 'Wire Transfer',
          status: 'completed'
        },
        {
          company_id: companyId,
          project_id: projects[1].id,
          vendor_name: 'United Rentals',
          amount: 25000,
          payment_date: '2024-12-01',
          payment_method: 'Bank Transfer',
          status: 'pending'
        },
        {
          company_id: companyId,
          project_id: projects[2].id,
          vendor_name: 'Design Architects Inc',
          amount: 15000,
          payment_date: '2024-12-05',
          payment_method: 'Check',
          status: 'pending'
        }
      ])
      .select();

    if (paymentsError) throw paymentsError;
    console.log(`✅ Created ${payments.length} payments\n`);

    // 4. SUMMARY
    console.log('=' .repeat(50));
    console.log('✅ MOCK DATA CREATED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log(`  • ${projects.length} projects`);
    console.log(`  • ${expenses.length} expenses (Total: $${expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toLocaleString()})`);
    console.log(`  • ${payments.length} payments (Total: $${payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()})`);
    console.log('\n🎉 Your dashboard should now show data!');
    console.log('   Refresh the page to see your graphs and charts.\n');

  } catch (error) {
    console.error('❌ Error creating mock data:', error);
    if (error.details) console.error(error.details);
    if (error.hint) console.error(error.hint);
    if (error.message) console.error(error.message);
  }
}

createMockData();
