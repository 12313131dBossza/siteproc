require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function simulateDashboardAPI() {
  console.log('\n=== SIMULATING DASHBOARD API CALL ===\n');
  
  const companyId = '0af17bea-44ab-4dfe-9fd0-75d6a2100857'; // TestCo
  
  console.log('Fetching data for company:', companyId);
  
  // Simulate the exact queries from the API
  const [projectsRes, expensesRes, deliveriesRes, paymentsRes] = await Promise.allSettled([
    supabase.from('projects').select('id, status, budget, actual_expenses, variance').eq('company_id', companyId),
    supabase.from('expenses').select('*').eq('company_id', companyId),
    supabase.from('deliveries').select('id, status, created_at, company_id').eq('company_id', companyId),
    supabase.from('payments').select('id, status, amount, payment_date, vendor_name').eq('company_id', companyId),
  ]);

  console.log('\n--- Query Results ---');
  console.log('Projects status:', projectsRes.status);
  if (projectsRes.status === 'fulfilled') {
    console.log('Projects data:', projectsRes.value.data);
    console.log('Projects error:', projectsRes.value.error);
    console.log('Projects count:', projectsRes.value.data?.length || 0);
  }
  
  console.log('\nExpenses status:', expensesRes.status);
  if (expensesRes.status === 'fulfilled') {
    console.log('Expenses count:', expensesRes.value.data?.length || 0);
    console.log('Expenses error:', expensesRes.value.error);
  }

  console.log('\nDeliveries status:', deliveriesRes.status);
  if (deliveriesRes.status === 'fulfilled') {
    console.log('Deliveries count:', deliveriesRes.value.data?.length || 0);
    console.log('Deliveries error:', deliveriesRes.value.error);
  }

  console.log('\nPayments status:', paymentsRes.status);
  if (paymentsRes.status === 'fulfilled') {
    console.log('Payments count:', paymentsRes.value.data?.length || 0);
    console.log('Payments error:', paymentsRes.value.error);
  }

  // Extract data like the API does
  const projects = projectsRes.status === 'fulfilled' ? (projectsRes.value.data || []) : [];
  const expenses = expensesRes.status === 'fulfilled' ? (expensesRes.value.data || []) : [];
  const deliveries = deliveriesRes.status === 'fulfilled' ? (deliveriesRes.value.data || []) : [];
  const payments = paymentsRes.status === 'fulfilled' ? (paymentsRes.value.data || []) : [];

  console.log('\n--- Extracted Arrays ---');
  console.log('Projects array length:', projects.length);
  console.log('Expenses array length:', expenses.length);
  console.log('Deliveries array length:', deliveries.length);
  console.log('Payments array length:', payments.length);

  // Calculate stats like the API does
  const stats = {
    projects: {
      total: projects.length,
      active: projects.filter((p) => p.status?.toLowerCase() === 'active').length,
      totalBudget: projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0),
      totalSpent: projects.reduce((sum, p) => sum + (Number(p.actual_expenses) || Number(p.actual_cost) || 0), 0),
    },
  };

  console.log('\n--- Calculated Stats ---');
  console.log('Stats object:', JSON.stringify(stats, null, 2));
  
  console.log('\n--- Individual Project Details ---');
  projects.forEach((p, i) => {
    console.log(`Project ${i + 1}:`, {
      id: p.id,
      status: p.status,
      budget: p.budget,
      actual_expenses: p.actual_expenses,
      variance: p.variance
    });
  });

  console.log('\n=== SUMMARY ===');
  console.log('✅ Total Projects:', stats.projects.total);
  console.log('✅ Total Budget:', '$' + stats.projects.totalBudget.toLocaleString());
  console.log('✅ Active Projects:', stats.projects.active);
  console.log('✅ Total Spent:', '$' + stats.projects.totalSpent.toLocaleString());
}

simulateDashboardAPI();
