// Test what the API actually returns
const https = require('https');

const options = {
  hostname: 'siteproc1.vercel.app',
  port: 443,
  path: '/api/order-deliveries?limit=3',
  method: 'GET',
  headers: {
    'User-Agent': 'Node.js Debug'
  }
};

console.log('🌐 Testing API Response...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log('📊 API Status:', res.statusCode);
      console.log('📋 Response Keys:', Object.keys(response));
      
      if (response.deliveries) {
        console.log(`\n📦 Found ${response.deliveries.length} deliveries:`);
        
        response.deliveries.forEach((delivery, i) => {
          console.log(`\n${i+1}. Delivery #${delivery.id?.slice(-8)}`);
          console.log(`   Status: ${delivery.status}`);
          console.log(`   Total: $${delivery.total_amount}`);
          console.log(`   Items Array:`, delivery.items ? `${delivery.items.length} items` : 'NO ITEMS PROPERTY');
          console.log(`   Delivery Items:`, delivery.delivery_items ? `${delivery.delivery_items.length} items` : 'NO DELIVERY_ITEMS PROPERTY');
          
          if (delivery.items && delivery.items.length > 0) {
            delivery.items.forEach((item, j) => {
              console.log(`     Item ${j+1}: ${item.product_name} - Qty: ${item.quantity} - $${item.total_price}`);
            });
          }
          
          if (delivery.delivery_items && delivery.delivery_items.length > 0) {
            delivery.delivery_items.forEach((item, j) => {
              console.log(`     Raw Item ${j+1}: ${item.product_name} - Qty: ${item.quantity} - $${item.total_price}`);
            });
          }
        });
      } else {
        console.log('❌ No deliveries in response');
      }
      
    } catch (err) {
      console.error('❌ JSON Parse Error:', err.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request Error:', err.message);
});

req.end();
