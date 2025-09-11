import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await sbServer()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    // Verify project exists
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    // Resolve company from profile (best-effort)
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()
    const companyId = (profile as any)?.company_id || null

    // Pick a product with stock
    let { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id, stock')
      .gt('stock', 0)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (prodErr) {
      // fallthrough; product may still be null
    }
    if (!product) {
      return NextResponse.json({ error: 'no_product_with_stock' }, { status: 400 })
    }

    // Try insert variants to accommodate schema drift
    const variations = [
      { userCol: 'created_by', noteCol: 'note' },
      { userCol: 'created_by', noteCol: 'notes' },
      { userCol: 'user_id', noteCol: 'note' },
      { userCol: 'user_id', noteCol: 'notes' },
    ] as const

    let created: any = null
    let lastErr: any = null

    for (const v of variations) {
      const payload: any = {
        product_id: product.id,
        qty: 1,
        status: 'pending',
        project_id: projectId,
      }
      payload[v.userCol] = user.id
      payload[v.noteCol] = 'MOCK TEST ORDER'
      if (companyId) payload.company_id = companyId

      const res = await supabase
        .from('orders')
        .insert([payload])
        .select(`
          *,
          product:products(id, name, sku, price, unit)
        `)
        .single()

      if (!res.error) { created = res.data; break }
      lastErr = res.error
    }

    if (!created && lastErr) {
      // Minimal fallback without user/company/note
      const res2 = await supabase
        .from('orders')
        .insert([{ product_id: product!.id, qty: 1, status: 'pending', project_id: projectId }])
        .select('*')
        .single()
      if (res2.error) return NextResponse.json({ error: res2.error.message }, { status: 400 })
      created = res2.data
    }

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal_error' }, { status: 500 })
  }
}
