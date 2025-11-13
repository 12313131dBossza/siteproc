// Check user profiles and their company associations
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkUsersAndAuth() {
  console.log('\n👥 USER & AUTH CHECK\n')
  console.log('=' .repeat(80))

  // Get all profiles (including those without company_id)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, company_id, username, role, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log('\n📋 RECENT PROFILES (Last 20)')
  console.log('-'.repeat(80))

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  console.log(`\nTotal profiles: ${allProfiles?.length || 0}\n`)

  const withCompany = []
  const withoutCompany = []

  allProfiles?.forEach(profile => {
    if (profile.company_id) {
      withCompany.push(profile)
    } else {
      withoutCompany.push(profile)
    }

    const company = companies?.find(c => c.id === profile.company_id)
    console.log(`User: ${profile.username || profile.id.slice(0, 12)}...`)
    console.log(`  Role: ${profile.role || 'N/A'}`)
    console.log(`  Company: ${company?.name || (profile.company_id ? profile.company_id.slice(0, 12) + '...' : '❌ NONE')}`)
    console.log(`  Created: ${new Date(profile.created_at).toLocaleDateString()}\n`)
  })

  console.log('\n📊 PROFILE STATISTICS')
  console.log('-'.repeat(80))
  console.log(`With Company: ${withCompany.length}`)
  console.log(`Without Company: ${withoutCompany.length}`)

  if (withoutCompany.length > 0) {
    console.log(`\n⚠️  ${withoutCompany.length} users without company assignment!`)
    console.log('These users will not be able to see or create expenses.')
  }

  // Check auth.users table
  console.log('\n\n🔐 AUTH USERS CHECK')
  console.log('-'.repeat(80))

  try {
    const { data: authUsers, count } = await supabase.auth.admin.listUsers()
    
    console.log(`\nTotal auth users: ${authUsers?.users?.length || 0}\n`)

    if (authUsers?.users) {
      authUsers.users.slice(0, 10).forEach(user => {
        const profile = allProfiles?.find(p => p.id === user.id)
        console.log(`Email: ${user.email}`)
        console.log(`  ID: ${user.id}`)
        console.log(`  Profile: ${profile ? '✅ EXISTS' : '❌ MISSING'}`)
        if (profile) {
          const company = companies?.find(c => c.id === profile.company_id)
          console.log(`  Company: ${company?.name || '❌ NONE'}`)
        }
        console.log()
      })
    }
  } catch (e) {
    console.log('⚠️  Could not access auth.users (requires admin permissions)')
  }

  // Check for mismatches
  console.log('\n🔍 CHECKING FOR MISMATCHES')
  console.log('-'.repeat(80))

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, user_id, company_id, vendor, amount')

  // Group expenses by user
  const expensesByUser = {}
  expenses?.forEach(exp => {
    if (!expensesByUser[exp.user_id]) {
      expensesByUser[exp.user_id] = []
    }
    expensesByUser[exp.user_id].push(exp)
  })

  console.log(`\nUsers with expenses: ${Object.keys(expensesByUser).length}\n`)

  let mismatchesFound = false

  Object.entries(expensesByUser).forEach(([userId, userExpenses]) => {
    const profile = allProfiles?.find(p => p.id === userId)
    
    if (!profile) {
      mismatchesFound = true
      console.log(`❌ User ${userId.slice(0, 12)}... has ${userExpenses.length} expenses but NO PROFILE!`)
      return
    }

    if (!profile.company_id) {
      mismatchesFound = true
      console.log(`⚠️  User ${profile.username || userId.slice(0, 12)}... has ${userExpenses.length} expenses but NO COMPANY!`)
      return
    }

    // Check if all user's expenses match their company
    const wrongCompany = userExpenses.filter(e => e.company_id !== profile.company_id)
    if (wrongCompany.length > 0) {
      mismatchesFound = true
      const userCompany = companies?.find(c => c.id === profile.company_id)
      console.log(`❌ User ${profile.username || userId.slice(0, 12)}...`)
      console.log(`   Company: ${userCompany?.name}`)
      console.log(`   Mismatched expenses: ${wrongCompany.length}`)
    }
  })

  if (!mismatchesFound) {
    console.log('✅ All users with expenses have matching profiles and companies!')
  }

  console.log('\n' + '='.repeat(80))
}

checkUsersAndAuth()
  .then(() => {
    console.log('\n✅ Check complete!\n')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    process.exit(1)
  })
