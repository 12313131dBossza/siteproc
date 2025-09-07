// Create a test delivery with items for the "SiteProc Demo" company
const { createClient } = require('@supabase/supabase-js')

async function createTestDeliveryForSiteProcDemo() {
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

  console.log('=== CREATING TEST DELIVERY FOR SITEPROC DEMO COMPANY ===')
  
  const siteProcDemoCompanyId = '00000000-0000-4000-8000-000000000001'
  const bossUserId = '35a57302-cfec-48ef-b964-b28448ee68c4'
  
  // Create a new delivery
  const deliveryData = {
    order_id: `ORD-TEST-${Date.now()}`,
    delivery_date: new Date().toISOString(),
    status: 'pending',
    driver_name: 'Test Driver',
    vehicle_number: 'TEST-123',
    notes: 'Test delivery created to demonstrate item functionality',
    total_amount: 150.00,
    company_id: siteProcDemoCompanyId,
    created_by: bossUserId
  }

  console.log('Creating delivery:', deliveryData)
  
  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .insert(deliveryData)
    .select()
    .single()

  if (deliveryError) {
    console.error('Delivery creation error:', deliveryError)
    return
  }

  console.log('✅ Delivery created:', delivery.id)

  // Create delivery items
  const items = [
    {
      delivery_id: delivery.id,
      product_name: 'Cement Bags',
      quantity: 10,
      unit: 'bags',
      unit_price: 12.00,
      total_price: 120.00
    },
    {
      delivery_id: delivery.id,
      product_name: 'Steel Rods',
      quantity: 5,
      unit: 'pieces',
      unit_price: 6.00,
      total_price: 30.00
    }
  ]

  console.log('\nCreating delivery items:', items)

  const { data: createdItems, error: itemsError } = await supabase
    .from('delivery_items')
    .insert(items)
    .select()

  if (itemsError) {
    console.error('Items creation error:', itemsError)
    return
  }

  console.log('✅ Items created:', createdItems.length)
  console.table(createdItems)

  // Verify the delivery with items
  console.log('\n=== VERIFICATION ===')
  const { data: verifyDelivery } = await supabase
    .from('deliveries')
    .select(`
      id,
      order_id,
      total_amount,
      status,
      company_id,
      delivery_items(id, product_name, quantity, unit_price, total_price)
    `)
    .eq('id', delivery.id)
    .single()

  console.log('Delivery with items:')
  console.log(`  Order ID: ${verifyDelivery.order_id}`)
  console.log(`  Company ID: ${verifyDelivery.company_id}`)
  console.log(`  Total Amount: ₹${verifyDelivery.total_amount}`)
  console.log(`  Items: ${verifyDelivery.delivery_items.length}`)
  
  verifyDelivery.delivery_items.forEach((item, index) => {
    console.log(`    ${index + 1}. ${item.product_name}: ${item.quantity} @ ₹${item.unit_price} = ₹${item.total_price}`)
  })

  console.log('\n🎉 SUCCESS! Your SiteProc Demo company now has a delivery with items.')
  console.log('Refresh your browser page to see the delivery with "2 items" instead of "0 items".')
}

createTestDeliveryForSiteProcDemo().catch(console.error)
