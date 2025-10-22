# Test Adding Product

Open your browser console on https://siteproc1.vercel.app/toko and paste this:

```javascript
fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Product - ' + new Date().toISOString(),
    category: 'Steel & Metal',
    price: 99.99,
    unit: 'pcs',
    stock_quantity: 100,
    min_stock_level: 20,
    reorder_point: 25,
    reorder_quantity: 75,
    description: 'Test product for debugging',
    status: 'active',
    supplier_name: 'Test Supplier',
    supplier_email: 'test@supplier.com',
    supplier_phone: '555-1234',
    lead_time_days: 10
  })
})
.then(r => r.json())
.then(d => console.log('Result:', d))
.catch(e => console.error('Error:', e));
```

## What to check:

1. Go to https://siteproc1.vercel.app/toko
2. Open browser developer tools (F12)
3. Click "Add Product" button
4. Fill in the form
5. Click "Add Product" button in the modal
6. Check the console for any errors
7. Check the Network tab for the POST request to `/api/products`

## Expected behavior:
- The form should submit
- You should see a success toast notification
- The product should appear in the list
- The modal should close

## If it fails:
- Look for error messages in the console
- Check the Network tab for the response from `/api/products`
- Look for any 401, 403, or 500 errors
