const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addPayments() {
  console.log('\n=== ADDING PAYMENTS ===\n');

  const companyId = 'b019b7b2-32f6-42c0-a404-01db30872cfd';

  // Get existing projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('company_id', companyId)
    .order('created_at');

  if (!projects || projects.length === 0) {
    console.error('❌ No projects found');
    return;
  }

  console.log(`Found ${projects.length} projects\n`);

  try {
    const { data: payments, error } = await supabase
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

    if (error) throw error;

    console.log(`✅ Created ${payments.length} payments`);
    console.log(`   Total: $${payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}\n`);
    console.log('🎉 Done! Refresh your dashboard to see all the data.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.details) console.error('   Details:', error.details);
  }
}

addPayments();
