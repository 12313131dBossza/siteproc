// Create a test order linked to a project
// Usage: node scripts/create-test-order.js [projectId]

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

async function main() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ljhjstnzxnktnkpmtwxl.supabase.co');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaGpzdG56eG5rdG5rcG10d3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMwNDQ5MSwiZXhwIjoyMDQ5ODgwNDkxfQ.rIjcDOPLROD8dIhNg1Qj4CZFVvT6FMmOqKv0SxHzAzE');
  if (!url || !serviceKey) {
    console.error('Missing Supabase URL or service key. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  const argProjectId = process.argv[2] || null;
  console.log('Using project override:', argProjectId || '(auto-select)');

  // Find an admin/owner profile for company context
  const { data: admin, error: adminErr } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .in('role', ['admin','owner'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (adminErr) throw adminErr;
  if (!admin) throw new Error('No admin/owner profile found. Create one in profiles.');

  // Pick a project
  let projectId = argProjectId;
  if (!projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id, status, created_at')
      .eq('company_id', admin.company_id)
      .or('status.is.null,status.in.(active,on_hold)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!project) throw new Error('No project found in your company. Create a project first or pass a projectId.');
    projectId = project.id;
  }

  // Ensure a product with stock exists
  let { data: product } = await supabase
    .from('products')
    .select('id, stock')
    .gt('stock', 0)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!product) {
    const sku = 'MOCK-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const ins = await supabase
      .from('products')
      .insert([{ id: crypto.randomUUID(), name: 'MOCK TEST PRODUCT', sku, price: 12.34, stock: 100, unit: 'unit' }])
      .select('id')
      .single();
    if (ins.error) throw ins.error;
    product = ins.data;
  }

  // Try inserting an order with variations
  const variations = [
    { userCol: 'created_by', noteCol: 'note' },
    { userCol: 'created_by', noteCol: 'notes' },
    { userCol: 'user_id', noteCol: 'note' },
    { userCol: 'user_id', noteCol: 'notes' },
  ];

  let created = null;
  let lastErr = null;

  for (const v of variations) {
    const payload = {
      id: crypto.randomUUID(),
      product_id: product.id,
      qty: 1,
      status: 'pending',
      project_id: projectId,
      company_id: admin.company_id,
    };
    payload[v.userCol] = admin.id;
    payload[v.noteCol] = 'MOCK TEST ORDER';

    const res = await supabase
      .from('orders')
      .insert([payload])
      .select('*')
      .single();

    if (!res.error) {
      created = res.data;
      console.log(`Created test order using columns ${v.userCol}/${v.noteCol}:`, created.id);
      break;
    }

    console.warn(`Insert failed for ${v.userCol}/${v.noteCol}:`, res.error.message);
    lastErr = res.error;
  }

  if (!created && lastErr) {
    // Try minimal insert without company_id, note, and user
    const res = await supabase
      .from('orders')
      .insert([{ id: crypto.randomUUID(), product_id: product.id, qty: 1, status: 'pending', project_id: projectId }])
      .select('*')
      .single();
    if (res.error) throw res.error;
    created = res.data;
    console.log('Created minimal test order:', created.id);
  }

  console.log('DONE. Order ID:', created.id, 'Project ID:', projectId);
}

main().catch((e) => { console.error('ERROR:', e?.message || e); process.exit(1); });
