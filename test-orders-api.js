// Quick test script for orders API
// Run this in browser console on https://siteproc1.vercel.app

async function testOrdersAPI() {
  console.log('🔍 Testing Orders API...');
  
  // Test 1: Debug endpoint
  console.log('\n1️⃣ Testing debug endpoint...');
  try {
    const debugResponse = await fetch('/api/debug/orders-test');
    const debugData = await debugResponse.json();
    console.log('Debug response:', debugData);
  } catch (error) {
    console.error('Debug endpoint failed:', error);
  }
  
  // Test 2: Get products
  console.log('\n2️⃣ Testing products API...');
  try {
    const productsResponse = await fetch('/api/products');
    const productsData = await productsResponse.json();
    console.log('Products response:', productsData);
  } catch (error) {
    console.error('Products API failed:', error);
  }
  
  // Test 3: Create test order
  console.log('\n3️⃣ Testing order creation...');
  try {
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: 'test-product-id', // This will fail but show us the error
        qty: 1,
        notes: 'Test order from console'
      })
    });
    const orderData = await orderResponse.json();
    console.log('Order response:', orderData);
  } catch (error) {
    console.error('Order creation failed:', error);
  }
  
  console.log('\n✅ Test complete!');
}

// Run the test
testOrdersAPI();
