const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMockData() {
  console.log('=== CREATING MOCK DATA FOR YOUR COMPANY ===\n');

  // Get the most recent company (yours)
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!companies || companies.length === 0) {
    console.error('No company found!');
    return;
  }

  const company = companies[0];
  const companyId = company.id;
  console.log(`Creating data for: ${company.name}`);
  console.log(`Company ID: ${companyId}\n`);

  // Get a user ID from this company
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('company_id', companyId)
    .limit(1);

  const userId = profiles?.[0]?.id || '00000000-0000-0000-0000-000000000000';
  console.log(`Using user: ${profiles?.[0]?.email || 'system'}\n`);

  try {
    // 1. CREATE PROJECTS
    console.log('📁 Creating projects...');
    const projectsData = [
      {
        company_id: companyId,
        name: 'Downtown Office Renovation',
        status: 'active',
        budget: 150000,
        code: 'DOR-2024-001',
        description: 'Complete renovation of downtown office building'
      },
      {
        company_id: companyId,
        name: 'Residential Complex - Phase 1',
        status: 'active',
        budget: 500000,
        code: 'RES-2024-002',
        description: '50-unit residential complex construction'
      },
      {
        company_id: companyId,
        name: 'Shopping Mall Expansion',
        status: 'planning',
        budget: 2000000,
        code: 'SML-2024-003',
        description: 'Expansion of existing shopping center'
      }
    ];

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .insert(projectsData)
      .select();

    if (projectsError) throw projectsError;
    console.log(`✅ Created ${projects.length} projects\n`);

    // 2. CREATE PURCHASE ORDERS
    console.log('🛒 Creating purchase orders...');
    const ordersData = [
      {
        company_id: companyId,
        description: 'Cement and Concrete Mix - 100 bags',
        vendor: 'BuildMart Supplies',
        status: 'approved',
        amount: 8500,
        created_at: new Date('2024-10-15').toISOString(),
        ordered_qty: 100,
        delivered_qty: 100,
        delivery_progress: 'completed'
      },
      {
        company_id: companyId,
        description: 'Steel Rebar - 50 tons',
        vendor: 'Metro Steel Co.',
        status: 'approved',
        amount: 45000,
        created_at: new Date('2024-10-20').toISOString(),
        ordered_qty: 50,
        delivered_qty: 35,
        delivery_progress: 'partially_delivered'
      },
      {
        company_id: companyId,
        description: 'Lumber Package - Mixed Sizes',
        vendor: 'Timber Traders Inc',
        status: 'approved',
        amount: 12000,
        created_at: new Date('2024-11-01').toISOString(),
        ordered_qty: 500,
        delivered_qty: 0,
        delivery_progress: 'pending_delivery'
      },
      {
        company_id: companyId,
        description: 'Electrical Supplies - Wiring & Fixtures',
        vendor: 'PowerPro Electric',
        status: 'pending',
        amount: 18500,
        created_at: new Date('2024-11-10').toISOString(),
        ordered_qty: 1,
        delivered_qty: 0,
        delivery_progress: 'pending_delivery'
      }
    ];

    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .insert(ordersData)
      .select();

    if (ordersError) throw ordersError;
    console.log(`✅ Created ${orders.length} purchase orders\n`);

    // 3. CREATE EXPENSES
    console.log('💰 Creating expenses...');
    const expensesData = [
      // Labor expenses
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'ABC Construction Crew',
        category: 'labor',
        amount: 25000,
        description: 'Week 1-2 labor costs - Downtown Office',
        status: 'approved',
        spent_at: '2024-09-15',
        project_id: projects[0].id
      },
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'ABC Construction Crew',
        category: 'labor',
        amount: 28000,
        description: 'Week 3-4 labor costs - Downtown Office',
        status: 'approved',
        spent_at: '2024-10-01',
        project_id: projects[0].id
      },
      // Materials expenses
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'BuildMart Supplies',
        category: 'materials',
        amount: 8500,
        description: 'Cement delivery - 100 bags',
        status: 'approved',
        spent_at: '2024-10-15',
        project_id: projects[1].id
      },
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'Home Depot',
        category: 'materials',
        amount: 3200,
        description: 'Paint, brushes, and finishing supplies',
        status: 'approved',
        spent_at: '2024-10-22',
        project_id: projects[0].id
      },
      // Equipment expenses
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'United Rentals',
        category: 'equipment',
        amount: 4500,
        description: 'Excavator rental - 2 weeks',
        status: 'approved',
        spent_at: '2024-09-20',
        project_id: projects[1].id
      },
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'United Rentals',
        category: 'equipment',
        amount: 2800,
        description: 'Scaffolding rental - 1 month',
        status: 'approved',
        spent_at: '2024-10-01',
        project_id: projects[0].id
      },
      // Transportation
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'FastFreight Logistics',
        category: 'transportation',
        amount: 1200,
        description: 'Material delivery - Steel shipment',
        status: 'approved',
        spent_at: '2024-10-25',
        project_id: projects[1].id
      },
      // Recent pending expenses
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'Office Depot',
        category: 'other',
        amount: 450,
        description: 'Office supplies and safety equipment',
        status: 'pending',
        spent_at: '2024-11-10',
        project_id: projects[0].id
      },
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'Fuel Express',
        category: 'transportation',
        amount: 890,
        description: 'Fuel for construction vehicles',
        status: 'pending',
        spent_at: '2024-11-12',
        project_id: projects[1].id
      },
      // This month's expenses
      {
        company_id: companyId,
        user_id: userId,
        vendor: 'Metro Steel Co.',
        category: 'materials',
        amount: 45000,
        description: 'Steel rebar - 50 tons',
        status: 'approved',
        spent_at: '2024-11-05',
        project_id: projects[1].id
      }
    ];

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .insert(expensesData)
      .select();

    if (expensesError) throw expensesError;
    console.log(`✅ Created ${expenses.length} expenses\n`);

    // 4. CREATE DELIVERIES
    console.log('🚚 Creating deliveries...');
    const deliveriesData = [
      {
        company_id: companyId,
        order_id: `DEL-${Date.now()}-1`,
        driver_name: 'John Smith',
        vehicle_number: 'TRK-001',
        status: 'delivered',
        delivery_date: '2024-10-16',
        notes: 'Cement delivered to site - all bags accounted for',
        items: [
          { product_name: 'Portland Cement', quantity: 100, unit: 'bags', unit_price: 85 }
        ]
      },
      {
        company_id: companyId,
        order_id: `DEL-${Date.now()}-2`,
        driver_name: 'Mike Johnson',
        vehicle_number: 'TRK-002',
        status: 'delivered',
        delivery_date: '2024-10-21',
        notes: 'Steel rebar partial delivery - 35 tons',
        items: [
          { product_name: 'Steel Rebar #4', quantity: 35, unit: 'tons', unit_price: 900 }
        ]
      },
      {
        company_id: companyId,
        order_id: `DEL-${Date.now()}-3`,
        driver_name: 'Sarah Williams',
        vehicle_number: 'TRK-003',
        status: 'pending',
        delivery_date: '2024-11-15',
        notes: 'Lumber shipment scheduled',
        items: [
          { product_name: '2x4 Lumber 8ft', quantity: 300, unit: 'pieces', unit_price: 8 },
          { product_name: '2x6 Lumber 10ft', quantity: 200, unit: 'pieces', unit_price: 15 }
        ]
      }
    ];

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .insert(deliveriesData)
      .select();

    if (deliveriesError) throw deliveriesError;
    console.log(`✅ Created ${deliveries.length} deliveries\n`);

    // 5. CREATE PAYMENTS
    console.log('💳 Creating payments...');
    const paymentsData = [
      {
        company_id: companyId,
        vendor: 'ABC Construction Crew',
        amount: 25000,
        status: 'paid',
        payment_date: '2024-09-30',
        notes: 'Labor payment - Week 1-2'
      },
      {
        company_id: companyId,
        vendor: 'BuildMart Supplies',
        amount: 8500,
        status: 'paid',
        payment_date: '2024-10-20',
        notes: 'Cement delivery payment'
      },
      {
        company_id: companyId,
        vendor: 'United Rentals',
        amount: 4500,
        status: 'paid',
        payment_date: '2024-10-05',
        notes: 'Equipment rental - Excavator'
      },
      {
        company_id: companyId,
        vendor: 'Metro Steel Co.',
        amount: 45000,
        status: 'unpaid',
        payment_date: null,
        notes: 'Steel rebar - Payment pending'
      },
      {
        company_id: companyId,
        vendor: 'PowerPro Electric',
        amount: 18500,
        status: 'unpaid',
        payment_date: null,
        notes: 'Electrical supplies - Pending delivery'
      }
    ];

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .insert(paymentsData)
      .select();

    if (paymentsError) throw paymentsError;
    console.log(`✅ Created ${payments.length} payments\n`);

    // SUMMARY
    console.log('═══════════════════════════════════════');
    console.log('✅ MOCK DATA CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════\n');
    
    console.log(`Company: ${company.name}`);
    console.log(`📁 Projects: ${projects.length}`);
    console.log(`🛒 Orders: ${orders.length}`);
    console.log(`💰 Expenses: ${expenses.length} (Total: $${expensesData.reduce((sum, e) => sum + e.amount, 0).toLocaleString()})`);
    console.log(`🚚 Deliveries: ${deliveries.length}`);
    console.log(`💳 Payments: ${payments.length} (Paid: $${paymentsData.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString()})`);
    
    console.log('\n📊 Dashboard should now show:');
    console.log('   • Budget vs Actual charts');
    console.log('   • Monthly financial trends');
    console.log('   • Top vendors breakdown');
    console.log('   • Expense category pie chart');
    console.log('   • Project status overview');
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Hard refresh the dashboard (Ctrl+Shift+R)');
    console.log('   2. Check that graphs show data');
    console.log('   3. Verify all data is isolated to your company');

  } catch (error) {
    console.error('❌ Error creating mock data:', error);
    throw error;
  }
}

createMockData().catch(console.error);
