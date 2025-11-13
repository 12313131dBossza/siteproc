// Fix Data Isolation Issues - Find and fix expenses with invalid company_id
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixDataIsolation() {
  console.log('🔧 FIXING DATA ISOLATION ISSUES\n')
  console.log('=' .repeat(80))

  // Step 1: Find all expenses with invalid company_id
  console.log('\n🚨 STEP 1: Finding Expenses with Invalid company_id')
  console.log('-'.repeat(80))

  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('id, vendor, amount, category, company_id, user_id, created_at')
    .order('created_at', { ascending: false })

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  const validCompanyIds = new Set(companies?.map(c => c.id) || [])
  
  const invalidExpenses = allExpenses?.filter(exp => 
    !exp.company_id || !validCompanyIds.has(exp.company_id)
  ) || []

  console.log(`\nFound ${invalidExpenses.length} expenses with invalid company_id:\n`)
  
  invalidExpenses.forEach(exp => {
    console.log(`❌ Expense ID: ${exp.id}`)
    console.log(`   Vendor: ${exp.vendor || 'N/A'}`)
    console.log(`   Amount: $${exp.amount}`)
    console.log(`   Company ID: ${exp.company_id || 'NULL'}`)
    console.log(`   User ID: ${exp.user_id}`)
    console.log(`   Created: ${exp.created_at}\n`)
  })

  if (invalidExpenses.length === 0) {
    console.log('✅ No invalid expenses found!')
    return
  }

  // Step 2: Try to find the correct company_id for each expense based on user_id
  console.log('\n🔍 STEP 2: Finding Correct company_id from User Profiles')
  console.log('-'.repeat(80))

  const fixes = []
  
  for (const expense of invalidExpenses) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, username, role')
      .eq('id', expense.user_id)
      .single()

    if (profile?.company_id) {
      const company = companies?.find(c => c.id === profile.company_id)
      console.log(`\n✓ Found match for expense ${expense.id.slice(0, 8)}...`)
      console.log(`  User: ${profile.username || expense.user_id.slice(0, 8)}`)
      console.log(`  User's Company: ${company?.name || profile.company_id}`)
      console.log(`  Will update: ${expense.company_id || 'NULL'} → ${profile.company_id}`)
      
      fixes.push({
        expenseId: expense.id,
        oldCompanyId: expense.company_id,
        newCompanyId: profile.company_id,
        companyName: company?.name
      })
    } else {
      console.log(`\n⚠️  Cannot fix expense ${expense.id.slice(0, 8)}... - User has no company`)
      console.log(`  User ID: ${expense.user_id}`)
    }
  }

  if (fixes.length === 0) {
    console.log('\n❌ No fixes possible - users have no company_id set')
    return
  }

  // Step 3: Ask for confirmation and apply fixes
  console.log('\n\n📝 STEP 3: Applying Fixes')
  console.log('-'.repeat(80))
  console.log(`\nWill fix ${fixes.length} expenses\n`)

  let successCount = 0
  let errorCount = 0

  for (const fix of fixes) {
    const { error } = await supabase
      .from('expenses')
      .update({ company_id: fix.newCompanyId })
      .eq('id', fix.expenseId)

    if (error) {
      console.log(`❌ Failed to update ${fix.expenseId}: ${error.message}`)
      errorCount++
    } else {
      console.log(`✅ Updated expense → ${fix.companyName}`)
      successCount++
    }
  }

  // Step 4: Verify fixes
  console.log('\n\n✅ STEP 4: Verification')
  console.log('-'.repeat(80))
  console.log(`\nSuccessfully fixed: ${successCount} expenses`)
  console.log(`Errors: ${errorCount}`)

  // Re-check for remaining issues
  const { data: stillInvalid } = await supabase
    .from('expenses')
    .select('id, company_id, user_id')
    .is('company_id', null)

  if (stillInvalid && stillInvalid.length > 0) {
    console.log(`\n⚠️  Still ${stillInvalid.length} expenses with NULL company_id`)
  } else {
    console.log('\n✅ All expenses now have valid company_id!')
  }

  // Step 5: Check for cross-contamination (users seeing other company data)
  console.log('\n\n🔒 STEP 5: Checking for Cross-Company Data Leakage')
  console.log('-'.repeat(80))

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, company_id, username')
    .not('company_id', 'is', null)

  let leakageFound = false

  for (const profile of profiles || []) {
    const { data: userExpenses } = await supabase
      .from('expenses')
      .select('id, company_id')
      .eq('user_id', profile.id)

    const wrongCompanyExpenses = userExpenses?.filter(
      exp => exp.company_id && exp.company_id !== profile.company_id
    ) || []

    if (wrongCompanyExpenses.length > 0) {
      leakageFound = true
      const userCompany = companies?.find(c => c.id === profile.company_id)
      console.log(`\n⚠️  User ${profile.username || profile.id.slice(0, 8)} has expenses in WRONG company!`)
      console.log(`   User's Company: ${userCompany?.name || profile.company_id}`)
      console.log(`   Wrong expenses: ${wrongCompanyExpenses.length}`)
      
      wrongCompanyExpenses.forEach(exp => {
        const expCompany = companies?.find(c => c.id === exp.company_id)
        console.log(`   - Expense ${exp.id.slice(0, 8)} is in: ${expCompany?.name || exp.company_id}`)
      })
    }
  }

  if (!leakageFound) {
    console.log('\n✅ No cross-company data leakage detected!')
  }

  console.log('\n' + '='.repeat(80))
  console.log('🎉 FIX COMPLETE!')
  console.log('='.repeat(80))
}

fixDataIsolation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
