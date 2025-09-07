// Check company and profile relationships with correct credentials
const { createClient } = require('@supabase/supabase-js')

async function analyzeCompanyAndDeliveryMismatch() {
  const supabase = createClient(
    'https://vrkgtygzcokqoeeutvxd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log('=== ANALYZING THE COMPANY_ID MISMATCH ISSUE ===')
  
  const userId = '35a57302-cfec-48ef-b964-b28448ee68c4' // bossbcz@gmail.com
  
  // Check user profile
  console.log('\n1. User Profile Information:')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, company_id, role')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('Profile error:', profileError)
  } else {
    console.table([profile])
  }

  // Check all companies
  console.log('\n2. All Companies in System:')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (companiesError) {
    console.error('Companies error:', companiesError)
  } else {
    console.table(companies)
    
    // Find user's actual company
    const userCompany = companies.find(c => c.id === profile?.company_id)
    console.log('\nUser belongs to company:', userCompany)
  }

  // Check all deliveries
  console.log('\n3. All Deliveries with Company ID:')
  const { data: deliveries, error: deliveriesError } = await supabase
    .from('deliveries')
    .select('id, company_id, created_at, total_amount, status')
    .order('created_at')

  if (deliveriesError) {
    console.error('Deliveries error:', deliveriesError)
  } else {
    console.table(deliveries)
    
    // Analyze delivery company_ids
    const deliveryCompanyIds = [...new Set(deliveries.map(d => d.company_id))]
    console.log('\nUnique company_ids in deliveries:')
    deliveryCompanyIds.forEach(companyId => {
      const company = companies?.find(c => c.id === companyId)
      const count = deliveries.filter(d => d.company_id === companyId).length
      console.log(`- ${companyId} → ${company?.name || 'UNKNOWN COMPANY'} (${count} deliveries)`)
    })
  }

  // Check delivery items
  console.log('\n4. Delivery Items Analysis:')
  const { data: items, error: itemsError } = await supabase
    .from('delivery_items')
    .select('id, delivery_id, product_name, quantity, total_price')

  if (itemsError) {
    console.error('Items error:', itemsError)
  } else {
    console.log(`Found ${items.length} delivery items`)
    console.table(items)
  }

  // Show the JOIN that should work if company_ids matched
  console.log('\n5. Testing JOIN Without Company Filter:')
  const { data: joinResults, error: joinError } = await supabase
    .from('deliveries')
    .select(`
      id,
      company_id,
      total_amount,
      delivery_items(id, product_name, quantity, total_price)
    `)
    .order('created_at')

  if (joinError) {
    console.error('Join error:', joinError)
  } else {
    console.log('Deliveries with items (no company filter):')
    joinResults.forEach(delivery => {
      console.log(`\nDelivery ${delivery.id}:`)
      console.log(`  Company ID: ${delivery.company_id}`)
      console.log(`  Total Amount: ${delivery.total_amount}`)
      console.log(`  Items: ${delivery.delivery_items?.length || 0}`)
      if (delivery.delivery_items?.length > 0) {
        delivery.delivery_items.forEach(item => {
          console.log(`    - ${item.product_name}: ${item.quantity} (₹${item.total_price})`)
        })
      }
    })
  }

  console.log('\n=== ROOT CAUSE ANALYSIS ===')
  console.log('The deliveries were created with a company_id that does NOT exist in your companies table.')
  console.log('This means when the API filters by your actual company_id, it finds no deliveries.')
  console.log('\nSolutions:')
  console.log('A. Run the SQL fix to update existing delivery company_ids (one-time fix)')
  console.log('B. Find and fix the delivery creation code to use correct company_id (prevents future issues)')
}

analyzeCompanyAndDeliveryMismatch().catch(console.error)
