// Test the exact query that the API is running
const { createClient } = require('@supabase/supabase-js')

async function testActualAPIQuery() {
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

  console.log('=== TESTING EXACT API QUERY ===')
  
  const sdeCompanyId = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'
  
  // This is the exact query the API uses
  let query = supabase
    .from('deliveries')
    .select(`*, delivery_items (*)`)
    .eq('company_id', sdeCompanyId)
    .order('created_at', { ascending: false })

  const { data: deliveries, error } = await query

  if (error) {
    console.error('❌ Query error:', error)
    return
  }

  console.log(`✅ Found ${deliveries?.length || 0} deliveries`)
  
  deliveries?.forEach((delivery, index) => {
    console.log(`\n${index + 1}. Delivery ${delivery.id.slice(-8)}:`)
    console.log(`   Order ID: ${delivery.order_id}`)
    console.log(`   Total: $${delivery.total_amount}`)
    console.log(`   Raw delivery_items:`, delivery.delivery_items)
    console.log(`   Is delivery_items array?`, Array.isArray(delivery.delivery_items))
    console.log(`   Items count:`, delivery.delivery_items?.length || 0)
    
    if (delivery.delivery_items && delivery.delivery_items.length > 0) {
      delivery.delivery_items.forEach((item, i) => {
        console.log(`     ${i + 1}. ${item.product_name}: ${item.quantity} ${item.unit} @ $${item.unit_price}`)
      })
    } else {
      console.log('     ❌ No items found')
    }
  })

  // Test if the problem is with the LEFT JOIN vs INNER JOIN
  console.log('\n=== TESTING WITH INNER JOIN (should only return deliveries WITH items) ===')
  const { data: deliveriesWithItems, error: innerError } = await supabase
    .from('deliveries')
    .select(`
      *,
      delivery_items!inner(*)
    `)
    .eq('company_id', sdeCompanyId)
    .order('created_at', { ascending: false })

  if (innerError) {
    console.error('❌ Inner join error:', innerError)
  } else {
    console.log(`✅ Found ${deliveriesWithItems?.length || 0} deliveries WITH items (inner join)`)
    deliveriesWithItems?.forEach((delivery, index) => {
      console.log(`   ${index + 1}. ${delivery.order_id}: ${delivery.delivery_items?.length || 0} items`)
    })
  }
}

testActualAPIQuery().catch(console.error)
