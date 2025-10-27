/**
 * Run SQL script in Supabase - Activity Logs Setup
 * Usage: node run-activity-logs-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️  ACTIVITY LOGS DATABASE SETUP');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');

// Read the SQL file
const sqlPath = path.join(__dirname, 'create-activity-logs-table-safe.sql');

if (!fs.existsSync(sqlPath)) {
  console.error('❌ Error: create-activity-logs-table-safe.sql not found');
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('✅ SQL script loaded');
console.log(`📄 File: ${sqlPath}`);
console.log(`📏 Size: ${sqlContent.length} characters`);
console.log('');

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('📋 INSTRUCTIONS TO RUN IN SUPABASE');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard');
console.log('2. Select your project: vrkgtygzcokqoeeutvxd');
console.log('3. Click "SQL Editor" in the left sidebar');
console.log('4. Click "+ New Query" button');
console.log('5. Copy the entire content of: create-activity-logs-table-safe.sql');
console.log('6. Paste into the SQL Editor');
console.log('7. Click "Run" button (or press Ctrl/Cmd + Enter)');
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('✨ WHAT THIS SCRIPT WILL DO:');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('✅ Create activity_type enum (delivery, expense, order, project, etc.)');
console.log('✅ Create activity_action enum (created, updated, deleted, etc.)');
console.log('✅ Create activity_logs table with all columns');
console.log('✅ Add foreign key constraints to auth.users and companies');
console.log('✅ Create 8 indexes for fast queries');
console.log('✅ Enable Row Level Security (RLS)');
console.log('✅ Create 3 RLS policies (view, insert, delete)');
console.log('✅ Create log_activity() helper function');
console.log('✅ Create activity_stats materialized view');
console.log('✅ Insert 3 example activities for testing');
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🔍 VERIFICATION QUERIES:');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('After running the script, verify it worked:');
console.log('');
console.log('-- Check table exists:');
console.log('SELECT * FROM activity_logs LIMIT 5;');
console.log('');
console.log('-- Check RLS is enabled:');
console.log('SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = \'activity_logs\';');
console.log('');
console.log('-- Check policies:');
console.log('SELECT * FROM pg_policies WHERE tablename = \'activity_logs\';');
console.log('');
console.log('-- Count activities:');
console.log('SELECT COUNT(*) as total FROM activity_logs;');
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');

// Check if we can connect to Supabase via API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  console.log('✅ Supabase credentials found in environment');
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log('');
  console.log('💡 TIP: You can also run this via the Supabase dashboard for easier debugging');
} else {
  console.log('⚠️  Supabase credentials not found in environment');
  console.log('💡 Make sure .env.local is properly configured');
}

console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🚀 READY TO PROCEED');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Choose your method:');
console.log('');
console.log('Method 1: Supabase Dashboard (RECOMMENDED)');
console.log('  → Go to https://supabase.com/dashboard');
console.log('  → SQL Editor → New Query');
console.log('  → Paste create-activity-logs-table-safe.sql');
console.log('  → Click Run');
console.log('');
console.log('Method 2: Supabase CLI (if installed)');
console.log('  → supabase db push --file create-activity-logs-table-safe.sql');
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('After running, test the Activity page at:');
console.log('https://siteproc1.vercel.app/activity');
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
