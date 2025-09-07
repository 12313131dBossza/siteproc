// Quick test to find user email by ID
// Usage: node test-user-lookup.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // if you have a .env file

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_ROLE:', serviceRoleKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function lookupUserById(userId) {
  console.log(`\n🔍 Looking up user: ${userId}`);
  
  try {
    // Method 1: Direct lookup by ID
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('❌ Auth API Error:', error.message);
      return null;
    }
    
    if (!user?.user) {
      console.log('❌ User not found');
      return null;
    }
    
    console.log('✅ User found:');
    console.log('  ID:', user.user.id);
    console.log('  Email:', user.user.email);
    console.log('  Created:', user.user.created_at);
    console.log('  Confirmed:', user.user.email_confirmed_at ? 'Yes' : 'No');
    
    // Also check if they have a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, company_id')
      .eq('id', userId)
      .single();
    
    if (profile) {
      console.log('✅ Profile found:');
      console.log('  Name:', profile.full_name || 'Not set');
      console.log('  Role:', profile.role || 'Not set');
      console.log('  Company ID:', profile.company_id || 'Not set');
    } else {
      console.log('⚠️  No profile found for this user');
    }
    
    return user.user.email;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

async function listAllUsers() {
  console.log('\n📋 Listing all users:');
  
  try {
    const { data: userList, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error.message);
      return;
    }
    
    if (!userList.users || userList.users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`✅ Found ${userList.users.length} users:`);
    userList.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 SiteProc User Lookup Tool\n');
    console.log('Usage:');
    console.log('  node test-user-lookup.js <user-id>     # Lookup specific user');
    console.log('  node test-user-lookup.js --list        # List all users');
    console.log('\nExamples:');
    console.log('  node test-user-lookup.js f3be5de6-de95-4a67-8e97-6e8321ae81e8');
    console.log('  node test-user-lookup.js --list');
    return;
  }
  
  if (args[0] === '--list' || args[0] === '-l') {
    await listAllUsers();
  } else {
    const userId = args[0];
    await lookupUserById(userId);
  }
}

main().catch(console.error);
