const { createClient } = require('@supabase/supabase-js')

async function checkProfileAndCompanyData() {
  const supabase = createClient(
    'https://vcfascryzgrwgvejnllz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZmFzY3J5emdyd2d2ZWpubGx6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjQ5ODU3NCwiZXhwIjoyMDM4MDc0NTc0fQ.7C_6YFUWd5qRd0tWmV2QnV7WUGWyj-5nEq5c3UsjUC0',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log('\n=== CHECKING USER PROFILE DATA ===')
  
  // Check the actual profile for bossbcz@gmail.com
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, company_id, full_name, role')
    .eq('email', 'bossbcz@gmail.com')

  if (profileError) {
    console.error('Profile error:', profileError)
  } else {
    console.log('Profile for bossbcz@gmail.com:')
    console.table(profiles)
  }

  // Check all companies
  console.log('\n=== ALL COMPANIES ===')
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (companyError) {
    console.error('Companies error:', companyError)
  } else {
    console.table(companies)
  }

  // Check which company_id the deliveries were created with
  console.log('\n=== DELIVERIES COMPANY_ID ANALYSIS ===')
  const { data: deliveries, error: deliveryError } = await supabase
    .from('deliveries')
    .select('id, company_id, created_at, total_amount')
    .order('created_at', { ascending: false })

  if (deliveryError) {
    console.error('Deliveries error:', deliveryError)
  } else {
    console.log('All deliveries with their company_id:')
    console.table(deliveries)
    
    // Group by company_id
    const grouped = deliveries.reduce((acc, delivery) => {
      if (!acc[delivery.company_id]) {
        acc[delivery.company_id] = []
      }
      acc[delivery.company_id].push(delivery)
      return acc
    }, {})
    
    console.log('\nDeliveries grouped by company_id:')
    Object.entries(grouped).forEach(([companyId, deliveryList]) => {
      console.log(`\nCompany ID: ${companyId}`)
      console.log(`Count: ${deliveryList.length}`)
    })
  }
  
  // Check if the wrong company_id (347ead33) exists in companies table
  console.log('\n=== CHECKING MYSTERY COMPANY_ID ===')
  const { data: mysteryCompany, error: mysteryError } = await supabase
    .from('companies')
    .select('*')
    .ilike('id', '%347ead33%')

  if (mysteryError) {
    console.error('Mystery company error:', mysteryError)
  } else {
    console.log('Company with ID containing 347ead33:')
    console.table(mysteryCompany)
  }
}

checkProfileAndCompanyData().catch(console.error)
