require('dotenv').config({ path: '.env.local' });

async function checkEnvEndpoint() {
  try {
    console.log('\n=== CHECKING ENV ENDPOINT ===\n');
    
    const response = await fetch('http://localhost:3000/api/debug/env-check');
    const data = await response.json();
    
    console.log('Environment Check:', JSON.stringify(data, null, 2));
    
    if (!data.supabaseServiceRoleSet) {
      console.log('\n❌ PROBLEM FOUND: SUPABASE_SERVICE_ROLE is NOT SET!');
      console.log('   The dashboard API cannot bypass RLS without the service role key.');
    } else {
      console.log('\n✅ Service role key is set');
    }
  } catch (error) {
    console.error('Error checking env endpoint:', error.message);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

checkEnvEndpoint();
