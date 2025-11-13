// Clean up orphaned expenses and verify RLS policies
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

async function cleanupAndVerify() {
  console.log('🧹 CLEANING UP ORPHANED DATA & VERIFYING RLS\n')
  console.log('=' .repeat(80))

  // Step 1: Find orphaned expenses
  console.log('\n📊 STEP 1: Identifying Orphaned Expenses')
  console.log('-'.repeat(80))

  const { data: orphanedExpenses } = await supabase
    .from('expenses')
    .select('id, vendor, amount, company_id, user_id, created_at')
    .or('company_id.is.null,user_id.is.null')
    .order('created_at', { ascending: false })

  console.log(`\nFound ${orphanedExpenses?.length || 0} orphaned expenses (NULL company_id or user_id)`)
  
  if (orphanedExpenses && orphanedExpenses.length > 0) {
    console.log('\nThese expenses will be deleted as they are orphaned data:\n')
    orphanedExpenses.forEach(exp => {
      console.log(`  • ${exp.vendor || 'N/A'} - $${exp.amount}`)
      console.log(`    ID: ${exp.id}`)
      console.log(`    Company: ${exp.company_id || 'NULL'}`)
      console.log(`    User: ${exp.user_id || 'NULL'}`)
      console.log(`    Date: ${exp.created_at}\n`)
    })

    console.log(`\n⚠️  WARNING: About to delete ${orphanedExpenses.length} orphaned expenses`)
    console.log('These appear to be test data or artifacts from deleted users.\n')
    
    // Delete orphaned expenses
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .or('company_id.is.null,user_id.is.null')

    if (deleteError) {
      console.log(`❌ Error deleting orphaned expenses: ${deleteError.message}`)
    } else {
      console.log(`✅ Deleted ${orphanedExpenses.length} orphaned expenses`)
    }
  } else {
    console.log('\n✅ No orphaned expenses found')
  }

  // Step 2: Verify all expenses now have valid company_id
  console.log('\n\n🔍 STEP 2: Verifying Data Integrity')
  console.log('-'.repeat(80))

  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('id, company_id, user_id')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  const validCompanyIds = new Set(companies?.map(c => c.id) || [])
  const invalidExpenses = allExpenses?.filter(
    exp => !exp.company_id || !validCompanyIds.has(exp.company_id)
  ) || []

  console.log(`\nTotal expenses: ${allExpenses?.length || 0}`)
  console.log(`Invalid expenses: ${invalidExpenses.length}`)
  
  if (invalidExpenses.length === 0) {
    console.log('✅ All expenses have valid company_id!')
  } else {
    console.log('\n⚠️  Still have invalid expenses:')
    invalidExpenses.forEach(exp => {
      console.log(`  - ${exp.id}: company_id = ${exp.company_id}`)
    })
  }

  // Step 3: Check RLS policies
  console.log('\n\n🔒 STEP 3: Checking RLS Policies')
  console.log('-'.repeat(80))

  // Check if RLS is enabled
  const { data: rlsCheck } = await supabase
    .rpc('check_rls_enabled', { table_name: 'expenses' })
    .catch(() => ({ data: null }))

  // Alternative: try direct query
  const { data: tableCheck } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', 'expenses')
    .single()
    .catch(() => ({ data: null }))

  if (tableCheck) {
    console.log(`\nRLS Status: ${tableCheck.rowsecurity ? '✅ ENABLED' : '❌ DISABLED'}`)
  } else {
    console.log('\n⚠️  Could not check RLS status (requires DB permissions)')
  }

  // Check policies count
  const { data: policiesCount } = await supabase
    .from('pg_policies')
    .select('policyname', { count: 'exact' })
    .eq('schemaname', 'public')
    .eq('tablename', 'expenses')
    .catch(() => ({ data: null, count: null }))

  console.log(`RLS Policies: ${policiesCount ? policiesCount.length : 'Unknown'} policies`)

  // Step 4: Test data isolation by company
  console.log('\n\n🧪 STEP 4: Testing Data Isolation')
  console.log('-'.repeat(80))

  const expensesByCompany = {}
  allExpenses?.forEach(exp => {
    if (exp.company_id) {
      if (!expensesByCompany[exp.company_id]) {
        expensesByCompany[exp.company_id] = []
      }
      expensesByCompany[exp.company_id].push(exp)
    }
  })

  console.log(`\nExpenses distributed across ${Object.keys(expensesByCompany).length} companies:\n`)

  Object.entries(expensesByCompany).forEach(([companyId, expenses]) => {
    const company = companies?.find(c => c.id === companyId)
    console.log(`  ${company?.name || 'Unknown'}: ${expenses.length} expenses`)
  })

  // Step 5: Check user-company associations
  console.log('\n\n👥 STEP 5: Verifying User-Company Associations')
  console.log('-'.repeat(80))

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, company_id, username, role')
    .not('company_id', 'is', null)

  let crossContaminationFound = false

  for (const profile of profiles || []) {
    const { data: userExpenses } = await supabase
      .from('expenses')
      .select('id, company_id')
      .eq('user_id', profile.id)

    if (!userExpenses || userExpenses.length === 0) continue

    const wrongCompany = userExpenses.filter(
      exp => exp.company_id !== profile.company_id
    )

    if (wrongCompany.length > 0) {
      crossContaminationFound = true
      const userCompany = companies?.find(c => c.id === profile.company_id)
      console.log(`\n❌ CROSS-CONTAMINATION DETECTED!`)
      console.log(`  User: ${profile.username || profile.id.slice(0, 8)}`)
      console.log(`  User's Company: ${userCompany?.name || profile.company_id}`)
      console.log(`  Expenses in wrong company: ${wrongCompany.length}`)
      
      wrongCompany.forEach(exp => {
        const expCompany = companies?.find(c => c.id === exp.company_id)
        console.log(`    - Expense in: ${expCompany?.name || exp.company_id}`)
      })
    }
  }

  if (!crossContaminationFound) {
    console.log('\n✅ No cross-company contamination detected!')
    console.log('Each user only has expenses in their own company.')
  }

  // Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 SUMMARY')
  console.log('='.repeat(80))
  console.log(`\n✓ Total Companies: ${companies?.length || 0}`)
  console.log(`✓ Total Expenses: ${allExpenses?.length || 0}`)
  console.log(`✓ Companies with Expenses: ${Object.keys(expensesByCompany).length}`)
  console.log(`✓ Orphaned Expenses Cleaned: ${orphanedExpenses?.length || 0}`)
  console.log(`✓ Data Integrity: ${invalidExpenses.length === 0 ? '✅ GOOD' : '❌ ISSUES FOUND'}`)
  console.log(`✓ Data Isolation: ${crossContaminationFound ? '❌ ISSUES FOUND' : '✅ GOOD'}`)

  console.log('\n' + '='.repeat(80))

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS')
  console.log('-'.repeat(80))
  
  if (invalidExpenses.length === 0 && !crossContaminationFound) {
    console.log('\n✅ Your database is clean! Data isolation is working correctly.')
    console.log('\nTo ensure continued data isolation:')
    console.log('1. ✅ RLS policies should be enabled on expenses table')
    console.log('2. ✅ All expenses should filter by company_id')
    console.log('3. ✅ API routes should always check company_id matches user profile')
  } else {
    console.log('\n⚠️  Issues detected. Recommended actions:')
    if (invalidExpenses.length > 0) {
      console.log('\n1. Fix invalid expenses (wrong company_id):')
      console.log('   - Review and delete OR reassign to correct company')
    }
    if (crossContaminationFound) {
      console.log('\n2. Fix cross-company contamination:')
      console.log('   - Update expenses to match user\'s company_id')
    }
    console.log('\n3. Verify RLS policies are correctly applied')
    console.log('4. Check API routes always filter by company_id')
  }

  console.log('\n' + '='.repeat(80))
}

cleanupAndVerify()
  .then(() => {
    console.log('\n✅ Cleanup and verification complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
