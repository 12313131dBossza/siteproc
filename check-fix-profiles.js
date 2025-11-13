// Check and fix the profile creation trigger
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkAndFixTrigger() {
  console.log('\n🔍 CHECKING PROFILE CREATION TRIGGER\n')
  console.log('=' .repeat(80))

  // Step 1: Check if trigger exists
  console.log('\n📋 STEP 1: Checking for handle_new_user trigger')
  console.log('-'.repeat(80))

  try {
    const { data, error } = await supabase
      .from('pg_trigger')
      .select('tgname, tgrelid, tgfoid')
      .eq('tgname', 'on_auth_user_created')

    if (error) {
      console.log('⚠️  Cannot query triggers directly (permission issue)')
    } else if (data && data.length > 0) {
      console.log('✅ Trigger exists: on_auth_user_created')
    } else {
      console.log('❌ Trigger NOT found: on_auth_user_created')
      console.log('   This explains why profiles aren\'t being created!')
    }
  } catch (e) {
    console.log('⚠️  Cannot check triggers:', e.message)
  }

  // Step 2: Check auth users vs profiles
  console.log('\n\n👥 STEP 2: Comparing auth.users vs profiles')
  console.log('-'.repeat(80))

  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')

  const profileIds = new Set(profiles?.map(p => p.id) || [])
  const missingProfiles = authUsers?.users.filter(u => !profileIds.has(u.id)) || []

  console.log(`\nAuth Users: ${authUsers?.users?.length || 0}`)
  console.log(`Profiles: ${profiles?.length || 0}`)
  console.log(`Missing Profiles: ${missingProfiles.length}`)

  if (missingProfiles.length > 0) {
    console.log('\n❌ Users without profiles:')
    missingProfiles.forEach(user => {
      console.log(`   ${user.email} (ID: ${user.id.slice(0, 12)}...)`)
    })
  } else {
    console.log('\n✅ All auth users have profiles!')
  }

  // Step 3: Create missing profiles
  if (missingProfiles.length > 0) {
    console.log('\n\n🔧 STEP 3: Creating Missing Profiles')
    console.log('-'.repeat(80))

    for (const user of missingProfiles) {
      console.log(`\nCreating profile for: ${user.email}`)
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'member', // Default role
          // company_id will be set during onboarding
        })

      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
      } else {
        console.log(`   ✅ Profile created`)
      }
    }
  }

  // Step 4: Verify fix
  console.log('\n\n✅ STEP 4: Verification')
  console.log('-'.repeat(80))

  const { data: profilesAfter } = await supabase
    .from('profiles')
    .select('id, email, company_id, role')

  console.log(`\nTotal profiles now: ${profilesAfter?.length || 0}`)

  const stillMissing = authUsers?.users.filter(u => 
    !profilesAfter?.find(p => p.id === u.id)
  ) || []

  if (stillMissing.length === 0) {
    console.log('✅ All users now have profiles!')
  } else {
    console.log(`❌ Still missing ${stillMissing.length} profiles`)
  }

  // Step 5: Recommendations
  console.log('\n\n💡 RECOMMENDATIONS')
  console.log('-'.repeat(80))

  console.log('\n1. Apply the profile creation trigger migration:')
  console.log('   File: supabase/migrations/2025-08-26_profiles.sql')
  console.log('   This will auto-create profiles for future signups.\n')

  console.log('2. For existing users without company:')
  console.log('   - They need to go through onboarding')
  console.log('   - Or manually assign them to a company\n')

  console.log('3. Check RLS policies on profiles table:')
  console.log('   - Users must be able to insert their own profile row')
  console.log('   - Or trigger must run with SECURITY DEFINER\n')

  console.log('\n' + '='.repeat(80))
}

checkAndFixTrigger()
  .then(() => {
    console.log('\n✅ Check complete!\n')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
