// Test the change orders endpoint
// Open your browser console on /change-orders page and run this:

fetch('/api/admin/change-orders')
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err))

// Or test with fetch in a new tab:
// https://siteproc1.vercel.app/api/admin/change-orders
