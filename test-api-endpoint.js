// Test the actual API endpoint that your browser is calling
const fetch = require('node-fetch');

async function testDeliveryAPI() {
  console.log('=== TESTING DELIVERY API ENDPOINT ===');
  
  try {
    // Test the API endpoint directly
    const response = await fetch('https://siteproc.vercel.app/api/order-deliveries', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log('❌ API Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response received');
    console.log('Success:', data.success);
    console.log('Total deliveries returned:', data.deliveries?.length || 0);
    
    if (data.deliveries && data.deliveries.length > 0) {
      console.log('\nDeliveries with item counts:');
      data.deliveries.forEach((delivery, index) => {
        const itemsCount = delivery.delivery_items?.length || 0;
        console.log(`  ${index + 1}. ${delivery.order_id}: ${itemsCount} items (₹${delivery.total_amount})`);
      });
    }
    
    console.log('\nFull API response structure:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
  }
}

testDeliveryAPI();
