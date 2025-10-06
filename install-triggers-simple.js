// Simple script to install auto-calc triggers via Supabase REST API
const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'kylhdwtcgqzbkiyqxqfo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bGhkd3RjZ3F6YmtpeXF4cWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzAzOTA4NywiZXhwIjoyMDUyNjE1MDg3fQ.tnJxPXCt5Wz1JWBXLKgOW_HqqHAu-kVPEVQkFGq3xsI';

console.log('📦 Installing Project Auto-Calc Triggers\n');

// Read SQL file
const sql = fs.readFileSync('create-project-auto-calc-triggers.sql', 'utf8');

// Execute via Supabase Management API
const postData = JSON.stringify({ query: sql });

const options = {
  hostname: SUPABASE_URL,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  }
};

console.log('🚀 Executing SQL migration...\n');
console.log('If this fails, please:');
console.log('1. Open Supabase Dashboard → SQL Editor');
console.log('2. Copy contents from: create-project-auto-calc-triggers.sql');
console.log('3. Paste and run in SQL Editor\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Triggers installed successfully!');
      console.log('\n🎯 What was installed:');
      console.log('   ✅ actual_expenses column added to projects');
      console.log('   ✅ variance column added to projects');
      console.log('   ✅ Trigger: When expense approved → project.actual_expenses updates');
      console.log('   ✅ Trigger: When budget changes → variance recalculates');
      console.log('   ✅ All existing projects initialized with current totals');
      console.log('\n💡 Test it: Approve an expense and watch the project budget update automatically!');
    } else {
      console.log(`⚠️  Response code: ${res.statusCode}`);
      console.log('Response:', data);
      console.log('\n📝 MANUAL INSTALLATION INSTRUCTIONS:');
      console.log('1. Open: https://supabase.com/dashboard/project/kylhdwtcgqzbkiyqxqfo/sql/new');
      console.log('2. Copy the SQL from: create-project-auto-calc-triggers.sql');
      console.log('3. Paste into SQL Editor');
      console.log('4. Click "Run" button');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n📝 MANUAL INSTALLATION INSTRUCTIONS:');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Copy the SQL from: create-project-auto-calc-triggers.sql');
  console.log('3. Paste and click "Run"');
});

req.write(postData);
req.end();
