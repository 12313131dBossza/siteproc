// Run an arbitrary SQL file against Supabase via a security definer RPC called `exec`
// Usage: node scripts/run-sql.js path/to/file.sql

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node scripts/run-sql.js <file.sql>')
    process.exit(1)
  }
  const abs = path.resolve(file)
  const sql = fs.readFileSync(abs, 'utf8')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljhjstnzxnktnkpmtwxl.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaGpzdG56eG5rdG5rcG10d3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMwNDQ5MSwiZXhwIjoyMDQ5ODgwNDkxfQ.rIjcDOPLROD8dIhNg1Qj4CZFVvT6FMmOqKv0SxHzAzE'
  const supabase = createClient(url, key)

  console.log(`Executing SQL from ${abs} ...`)
  const { data, error } = await supabase.rpc('exec', { sql })
  if (error) {
    console.error('Failed to execute SQL via exec RPC:', error)
    process.exit(2)
  }
  console.log('SQL executed successfully.')
}

main().catch((err) => { console.error(err); process.exit(1) })
