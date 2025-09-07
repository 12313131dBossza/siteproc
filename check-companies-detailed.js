// Check company and profile relationships specifically
const { createClient } = require('@supabase/supabase-js')

async function checkCompanyStructure() {
  const supabase = createClient(
    'https://vrkgtygzcokqoeeutvxd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTczNjMzNywiZXhwIjoyMDQxMzEyMzM3fQ.KBLGzCt5CG5_jIGVHnSv05vBEcyxP9CBZQU5pEbQI08',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log('=== CHECKING COMPANY DATA FOR DELIVERIES ISSUE ===')
  
  // Get bossbcz profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, company_id, role')
    .eq('id', '35a57302-cfec-48ef-b964-b28448ee68c4')
    .single()

  console.log('bossbcz@gmail.com profile:')
  console.table([profile])

  // Get all companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  console.log('\nAll companies:')
  console.table(companies)

  // Get deliveries by company_id
  const { data: deliveries } = await supabase
    .from('deliveries')  
    .select('id, company_id, created_at, total_amount')
    .order('created_at')

  console.log('\nAll deliveries:')
  console.table(deliveries)

  // Find which company has the mystery ID
  const mysteryCompanyId = '347ead33-0306-40b1-a2ae-c5a5fc3d2eff'
  const matchingCompany = companies?.find(c => c.id === mysteryCompanyId)
  
  console.log(`\n=== MYSTERY COMPANY_ID ANALYSIS ===`)
  console.log(`Looking for company_id: ${mysteryCompanyId}`)
  console.log('Matching company:', matchingCompany || 'NOT FOUND')
  
  // Count deliveries by company
  if (deliveries) {
    const deliveryGroups = deliveries.reduce((acc, d) => {
      const companyName = companies?.find(c => c.id === d.company_id)?.name || 'Unknown Company'
      if (!acc[d.company_id]) {
        acc[d.company_id] = { company_name: companyName, count: 0 }
      }
      acc[d.company_id].count++
      return acc
    }, {})
    
    console.log('\nDeliveries by company:')
    Object.entries(deliveryGroups).forEach(([companyId, info]) => {
      console.log(`${info.company_name} (${companyId}): ${info.count} deliveries`)
    })
  }
}

checkCompanyStructure().catch(console.error)
