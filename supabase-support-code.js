// SUPABASE USER LOOKUP - COMPLETE CODE EXAMPLES
// This file shows all methods to find user email by user ID in Supabase
// You can share this with Supabase support for assistance

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================
const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://vrkgtygzcokqoeeutvxd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4Njc2NjIsImV4cCI6MjA3MTQ0MzY2Mn0.rBYMsJmz0hGNDpfSa2zd6U8KeBpNSgzCwF8H_2P9LYQ';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI';

// Client configurations
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Example user IDs from our database
const EXAMPLE_USER_IDS = [
  '35a57302-cfec-48ef-b964-b28448ee68c4', // bossbcz@gmail.com
  '73f7a36d-bcc1-4e44-8e55-6ee783dca6a9', // testmysuperbase@gmail.com
  'b21a0c0d-742e-4d5d-92a4-fc5ad6646583'  // ismelllikepook@gmail.com
];

// =============================================================================
// METHOD 1: AUTH ADMIN API (RECOMMENDED)
// =============================================================================
async function getUserByIdAuthAdmin(userId) {
  console.log(`\n🔍 METHOD 1: Auth Admin API - Looking up: ${userId}`);
  
  try {
    const { data: user, error } = await serviceClient.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }
    
    if (!user?.user) {
      console.log('❌ User not found');
      return null;
    }
    
    console.log('✅ Success:');
    console.log('  ID:', user.user.id);
    console.log('  Email:', user.user.email);
    console.log('  Created:', user.user.created_at);
    console.log('  Confirmed:', user.user.email_confirmed_at ? 'Yes' : 'No');
    
    return {
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at,
      email_confirmed_at: user.user.email_confirmed_at
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

// =============================================================================
// METHOD 2: LIST ALL USERS AND FIND BY ID
// =============================================================================
async function getUserByIdFromList(userId) {
  console.log(`\n🔍 METHOD 2: List Users - Looking up: ${userId}`);
  
  try {
    const { data: userList, error } = await serviceClient.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }
    
    const user = userList.users.find(u => u.id === userId);
    
    if (!user) {
      console.log('❌ User not found in list');
      return null;
    }
    
    console.log('✅ Success:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Created:', user.created_at);
    
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

// =============================================================================
// METHOD 3: PROFILES TABLE (IF EMAIL IS STORED THERE)
// =============================================================================
async function getUserFromProfiles(userId) {
  console.log(`\n🔍 METHOD 3: Profiles Table - Looking up: ${userId}`);
  
  try {
    const { data: profile, error } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }
    
    if (!profile) {
      console.log('❌ Profile not found');
      return null;
    }
    
    console.log('✅ Success:');
    console.log('  ID:', profile.id);
    console.log('  Email:', profile.email || 'Not stored in profiles');
    console.log('  Name:', profile.full_name || 'Not set');
    console.log('  Role:', profile.role || 'Not set');
    
    return profile;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

// =============================================================================
// METHOD 4: COMBINED AUTH + PROFILES
// =============================================================================
async function getUserComplete(userId) {
  console.log(`\n🔍 METHOD 4: Combined Auth + Profiles - Looking up: ${userId}`);
  
  try {
    // Get auth data
    const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user) {
      console.error('❌ Auth lookup failed:', authError?.message || 'User not found');
      return null;
    }
    
    // Get profile data
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name, role, company_id, companies(name)')
      .eq('id', userId)
      .single();
    
    // Get company name if available
    let companyName = null;
    if (profile?.company_id) {
      const { data: company } = await serviceClient
        .from('companies')
        .select('name')
        .eq('id', profile.company_id)
        .single();
      
      companyName = company?.name;
    }
    
    const result = {
      // From auth system
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      email_confirmed_at: authUser.user.email_confirmed_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      
      // From profiles table
      profile: profile ? {
        full_name: profile.full_name,
        role: profile.role,
        company_id: profile.company_id,
        company_name: companyName
      } : null
    };
    
    console.log('✅ Success - Complete user data:');
    console.log('  ID:', result.id);
    console.log('  Email:', result.email);
    console.log('  Name:', result.profile?.full_name || 'Not set');
    console.log('  Role:', result.profile?.role || 'Not set');
    console.log('  Company:', result.profile?.company_name || 'Not set');
    
    return result;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

// =============================================================================
// METHOD 5: SQL DIRECT QUERY
// =============================================================================
async function getUserBySql(userId) {
  console.log(`\n🔍 METHOD 5: SQL Query - Looking up: ${userId}`);
  
  try {
    // This queries the auth.users table directly
    const { data, error } = await serviceClient
      .rpc('get_user_by_id', { user_id: userId });
    
    if (error) {
      console.error('❌ Error:', error.message);
      // Fallback to regular profile query if RPC doesn't exist
      const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('❌ Profile query also failed:', profileError.message);
        return null;
      }
      
      console.log('✅ Fallback success via profiles:');
      console.log('  ID:', profile.id);
      console.log('  Email:', profile.email || 'Not in profiles');
      
      return profile;
    }
    
    console.log('✅ Success via SQL RPC:');
    console.log(data);
    
    return data;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

// =============================================================================
// TESTING ALL METHODS
// =============================================================================
async function testAllMethods() {
  console.log('🚀 SUPABASE USER LOOKUP - TESTING ALL METHODS');
  console.log('='.repeat(80));
  
  const testUserId = EXAMPLE_USER_IDS[0]; // Test with bossbcz@gmail.com
  
  // Test each method
  await getUserByIdAuthAdmin(testUserId);
  await getUserByIdFromList(testUserId);
  await getUserFromProfiles(testUserId);
  await getUserComplete(testUserId);
  await getUserBySql(testUserId);
  
  console.log('\n🔍 LISTING ALL USERS FOR REFERENCE:');
  console.log('='.repeat(50));
  
  try {
    const { data: userList, error } = await serviceClient.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error.message);
      return;
    }
    
    console.log(`✅ Found ${userList.users.length} total users:`);
    userList.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// DATABASE SCHEMA INFORMATION
// =============================================================================
async function showDatabaseSchema() {
  console.log('\n📋 DATABASE SCHEMA INFORMATION:');
  console.log('='.repeat(50));
  
  try {
    // Show profiles table structure
    const { data: profileColumns, error: profileError } = await serviceClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');
    
    if (!profileError && profileColumns) {
      console.log('\n✅ PROFILES TABLE STRUCTURE:');
      profileColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }
    
    // Show companies table structure
    const { data: companyColumns, error: companyError } = await serviceClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'companies')
      .eq('table_schema', 'public');
    
    if (!companyError && companyColumns) {
      console.log('\n✅ COMPANIES TABLE STRUCTURE:');
      companyColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }
    
    // Count records
    const { count: profileCount } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    const { count: companyCount } = await serviceClient
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 RECORD COUNTS:`);
    console.log(`  Profiles: ${profileCount || 0}`);
    console.log(`  Companies: ${companyCount || 0}`);
    
  } catch (error) {
    console.error('❌ Schema query error:', error.message);
  }
}

// =============================================================================
// ISSUE DEMONSTRATION (FOR SUPABASE SUPPORT)
// =============================================================================
async function demonstrateIssue() {
  console.log('\n🐛 ISSUE DEMONSTRATION FOR SUPABASE SUPPORT:');
  console.log('='.repeat(60));
  
  const userId = '35a57302-cfec-48ef-b964-b28448ee68c4';
  
  console.log('ISSUE: Need to find user email by user ID');
  console.log(`Target User ID: ${userId}`);
  console.log('Expected Email: bossbcz@gmail.com');
  console.log('');
  
  console.log('ATTEMPTS:');
  
  // Method 1: Auth Admin (works)
  console.log('1. auth.admin.getUserById() - ✅ WORKS');
  const authResult = await getUserByIdAuthAdmin(userId);
  
  // Method 2: Profiles table
  console.log('2. profiles table query - ⚠️ Email may not be stored');
  const profileResult = await getUserFromProfiles(userId);
  
  console.log('\nQUESTIONS FOR SUPABASE SUPPORT:');
  console.log('1. Is auth.admin.getUserById() the recommended way to get user email?');
  console.log('2. Should we store email in profiles table as well for easier queries?');
  console.log('3. Are there performance implications of using auth.admin methods frequently?');
  console.log('4. Is there a way to join auth.users with public tables in a single query?');
  console.log('5. What are the rate limits for auth.admin methods?');
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
async function main() {
  try {
    console.log('SUPABASE USER LOOKUP - COMPREHENSIVE TEST');
    console.log('Project: vrkgtygzcokqoeeutvxd.supabase.co');
    console.log('='.repeat(80));
    
    await testAllMethods();
    await showDatabaseSchema();
    await demonstrateIssue();
    
    console.log('\n✅ ALL TESTS COMPLETED');
    console.log('Share this output with Supabase support for assistance');
    
  } catch (error) {
    console.error('❌ Main execution error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export functions for use in other files
module.exports = {
  getUserByIdAuthAdmin,
  getUserByIdFromList,
  getUserFromProfiles,
  getUserComplete,
  testAllMethods,
  serviceClient,
  anonClient,
  EXAMPLE_USER_IDS
};
