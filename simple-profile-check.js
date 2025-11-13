// Simple direct check of profiles table
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function simpleCheck() {
  console.log('\n📊 SIMPLE PROFILE CHECK\n')
  console.log('=' .repeat(80))

  // Direct query
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('\n Profiles Query Result:')
  console.log('Error:', error)
  console.log('Count:', profiles?.length)
  
  if (profiles && profiles.length > 0) {
    console.log('\nAll Profiles:\n')
    profiles.forEach((p, idx) => {
      console.log(`${idx + 1}. ID: ${p.id}`)
      console.log(`   Email: ${p.email || 'N/A'}`)
      console.log(`   Username: ${p.username || 'N/A'}`)
      console.log(`   Company ID: ${p.company_id || 'NULL'}`)
      console.log(`   Role: ${p.role || 'N/A'}`)
      console.log(`   Created: ${p.created_at}`)
      console.log()
    })
  } else {
    console.log('\n❌ NO PROFILES FOUND')
  }

  // Check auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  console.log(`\nAuth Users: ${authUsers?.users?.length || 0}`)

  // Check companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  console.log(`Companies: ${companies?.length || 0}`)
  
  if (companies && companies.length > 0) {
    console.log('\nAvailable companies:')
    companies.forEach(c => {
      console.log(`- ${c.name} (${c.id})`)
    })
  }
}

simpleCheck()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
