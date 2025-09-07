// Check what tables actually exist and their structure
const { createClient } = require('@supabase/supabase-js')

async function checkDatabaseTables() {
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

  console.log('=== CHECKING WHAT TABLES EXIST ===')
  
  // Skip RPC for now, check tables directly

  // If RPC doesn't work, try direct queries
  console.log('Checking profiles table...')
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(3)

  if (profilesError) {
    console.log('Profiles error:', profilesError.message)
  } else {
    console.log('Profiles sample:', profilesData?.length || 0, 'records')
    if (profilesData?.[0]) {
      console.log('Profiles columns:', Object.keys(profilesData[0]))
    }
  }

  console.log('\nChecking companies table...')
  const { data: companiesData, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(3)

  if (companiesError) {
    console.log('Companies error:', companiesError.message)
  } else {
    console.log('Companies sample:', companiesData?.length || 0, 'records')
    if (companiesData?.[0]) {
      console.log('Companies columns:', Object.keys(companiesData[0]))
    }
  }

  console.log('\nChecking deliveries table...')
  const { data: deliveriesData, error: deliveriesError } = await supabase
    .from('deliveries')
    .select('*')
    .limit(3)

  if (deliveriesError) {
    console.log('Deliveries error:', deliveriesError.message)
  } else {
    console.log('Deliveries sample:', deliveriesData?.length || 0, 'records')
    if (deliveriesData?.[0]) {
      console.log('Deliveries columns:', Object.keys(deliveriesData[0]))
    }
  }

  console.log('\nChecking delivery_items table...')
  const { data: itemsData, error: itemsError } = await supabase
    .from('delivery_items')
    .select('*')
    .limit(3)

  if (itemsError) {
    console.log('Delivery_items error:', itemsError.message)
  } else {
    console.log('Delivery_items sample:', itemsData?.length || 0, 'records')
    if (itemsData?.[0]) {
      console.log('Delivery_items columns:', Object.keys(itemsData[0]))
    }
  }
}

checkDatabaseTables().catch(console.error)
