// Check profiles table structure
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProfiles() {
  try {
    console.log('Checking profiles table structure...')
    
    // Get one profile to see what columns exist
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Profiles error:', error)
      return
    }
    
    if (profiles.length > 0) {
      console.log('Profile columns:', Object.keys(profiles[0]))
      console.log('Sample profile data:', profiles[0])
    } else {
      console.log('No profiles found')
    }
    
    // Check if we can get profiles with different column names
    const { data: altProfiles, error: altError } = await supabase
      .from('profiles')
      .select('id, name, user_email, company_id')
      .limit(1)
    
    if (!altError && altProfiles.length > 0) {
      console.log('Alternative profile structure:', altProfiles[0])
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkProfiles()