// Check the specific delivery that's showing in the UI
const { createClient } = require('@supabase/supabase-js')

async function checkSpecificDelivery() {
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

  console.log('=== CHECKING THE SPECIFIC DELIVERY FROM UI ===')
  
  // The delivery ID from the screenshot appears to be the one with $75.5 total
  // Let's find it by the total amount and recent creation
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      id,
      order_id, 
      total_amount,
      status,
      company_id,
      delivery_items!inner(
        id,
        product_name,
        quantity,
        unit,
        unit_price,
        total_price
      )
    `)
    .eq('total_amount', 75.50)
    .eq('company_id', '1e2e7ccf-29fa-4511-b0d3-93c8347ead33') // sde company

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!deliveries || deliveries.length === 0) {
    console.log('❌ No delivery found with $75.5 total for sde company')
    return
  }

  console.log('✅ Found delivery with $75.5:')
  const delivery = deliveries[0]
  console.log(`  ID: ${delivery.id}`)
  console.log(`  Order ID: ${delivery.order_id}`)
  console.log(`  Total: $${delivery.total_amount}`)
  console.log(`  Status: ${delivery.status}`)
  console.log(`  Items count: ${delivery.delivery_items?.length || 0}`)
  
  if (delivery.delivery_items && delivery.delivery_items.length > 0) {
    console.log('  Items:')
    delivery.delivery_items.forEach((item, index) => {
      console.log(`    ${index + 1}. ${item.product_name || 'Unnamed'}: ${item.quantity} ${item.unit} @ $${item.unit_price} = $${item.total_price}`)
    })
  } else {
    console.log('  ❌ No items found!')
  }

  // Now let's check the same delivery without the inner join to see what's happening
  console.log('\n=== CHECKING SAME DELIVERY WITHOUT INNER JOIN ===')
  const { data: deliveryDirect, error: directError } = await supabase
    .from('deliveries')
    .select(`
      id,
      order_id,
      total_amount,
      delivery_items(id, product_name, quantity, unit_price, total_price)
    `)
    .eq('id', delivery.id)
    .single()

  if (directError) {
    console.error('Direct query error:', directError)
  } else {
    console.log('Direct query result:')
    console.log(`  Items array: ${Array.isArray(deliveryDirect.delivery_items)} (length: ${deliveryDirect.delivery_items?.length || 0})`)
    console.log(`  Items:`, deliveryDirect.delivery_items)
  }

  // Check delivery_items table directly for this delivery
  console.log('\n=== CHECKING DELIVERY_ITEMS TABLE DIRECTLY ===')
  const { data: directItems, error: itemsError } = await supabase
    .from('delivery_items')
    .select('*')
    .eq('delivery_id', delivery.id)

  if (itemsError) {
    console.error('Items query error:', itemsError)
  } else {
    console.log(`Found ${directItems?.length || 0} items directly:`)
    if (directItems) {
      console.table(directItems)
    }
  }
}

checkSpecificDelivery().catch(console.error)
