const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDashboardData() {
  console.log('=== CHECKING DASHBOARD DATA ===\n');

  // Get all companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent Companies:');
  console.table(companies);

  if (companies && companies.length > 0) {
    const companyId = companies[0].id;
    console.log(`\nChecking data for company: ${companies[0].name} (${companyId})\n`);

    // Check projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, budget, actual_cost')
      .eq('company_id', companyId);

    console.log(`Projects: ${projects?.length || 0}`);
    if (projects && projects.length > 0) {
      console.table(projects);
    }

    // Check orders
    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('id, description, status, amount')
      .eq('company_id', companyId);

    console.log(`\nPurchase Orders: ${orders?.length || 0}`);
    if (orders && orders.length > 0) {
      console.table(orders);
    }

    // Check deliveries
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('id, status, delivery_date, company_id')
      .eq('company_id', companyId);

    console.log(`\nDeliveries: ${deliveries?.length || 0}`);
    if (deliveries && deliveries.length > 0) {
      console.table(deliveries);
    }

    // Check expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, vendor, amount, category, status')
      .eq('company_id', companyId)
      .limit(10);

    console.log(`\nExpenses: ${expenses?.length || 0}`);
    if (expenses && expenses.length > 0) {
      console.table(expenses);
    }

    // Check report views
    console.log('\n=== CHECKING REPORT VIEWS ===\n');

    const { data: monthlyFinancial } = await supabase
      .from('report_monthly_financial_summary')
      .select('*')
      .eq('company_id', companyId);

    console.log(`Monthly Financial Summary: ${monthlyFinancial?.length || 0} records`);
    if (monthlyFinancial && monthlyFinancial.length > 0) {
      console.table(monthlyFinancial);
    }

    const { data: expenseBreakdown } = await supabase
      .from('report_expense_category_breakdown')
      .select('*')
      .eq('company_id', companyId);

    console.log(`\nExpense Category Breakdown: ${expenseBreakdown?.length || 0} records`);
    if (expenseBreakdown && expenseBreakdown.length > 0) {
      console.table(expenseBreakdown);
    }

    const { data: vendorSummary } = await supabase
      .from('report_vendor_summary')
      .select('*')
      .eq('company_id', companyId);

    console.log(`\nVendor Summary: ${vendorSummary?.length || 0} records`);
    if (vendorSummary && vendorSummary.length > 0) {
      console.table(vendorSummary);
    }
  }
}

checkDashboardData().catch(console.error);
