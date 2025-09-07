import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const sb = supabaseService()

    // 1) Company + Job
    const { data: company, error: cErr } = await (sb as any)
      .from('companies')
      .insert({ name: `PO Demo ${new Date().toISOString().slice(0,10)}` })
      .select('id')
      .single()
    if (cErr || !company) return NextResponse.json({ error: cErr?.message || 'Company create failed' }, { status: 500 })

    const { data: job, error: jErr } = await (sb as any)
      .from('jobs')
      .insert({ company_id: company.id, name: 'PO Demo Job', code: 'PO-DEMO' })
      .select('id')
      .single()
    if (jErr || !job) return NextResponse.json({ error: jErr?.message || 'Job create failed' }, { status: 500 })

    // 2) Supplier
    const { data: supplier, error: sErr } = await (sb as any)
      .from('suppliers')
      .insert({ company_id: company.id, name: 'Acme Supplies', email: 'demo@acme.local' })
      .select('id')
      .single()
    if (sErr || !supplier) return NextResponse.json({ error: sErr?.message || 'Supplier create failed' }, { status: 500 })

    // 3) RFQ
    const { data: rfq, error: rErr } = await (sb as any)
      .from('rfqs')
      .insert({ company_id: company.id, job_id: job.id, title: 'Demo RFQ', status: 'sent' })
      .select('id')
      .single()
    if (rErr || !rfq) return NextResponse.json({ error: rErr?.message || 'RFQ create failed' }, { status: 500 })

    // 3.1) RFQ Items (to be used as PO items for display)
    await (sb as any).from('rfq_items').insert([
      { company_id: company.id, rfq_id: rfq.id, description: '3/4" Plywood Sheet', qty: 20, unit: 'ea', sku: 'PLY-34' },
      { company_id: company.id, rfq_id: rfq.id, description: '2x4 Stud 8ft', qty: 100, unit: 'ea', sku: 'STUD-2x4-8' },
      { company_id: company.id, rfq_id: rfq.id, description: 'Construction Adhesive', qty: 12, unit: 'tube', sku: 'ADH-100' },
    ])

  // 4) Quote
  const { data: quoteData, error: qErr } = await (sb as any)
      .from('quotes')
      .insert({ company_id: company.id, rfq_id: rfq.id, supplier_id: supplier.id, total: 1234.56, lead_time: '1 week', terms: 'Net 30' })
      .select('id,total')
      .single()
  if (qErr || !quoteData) return NextResponse.json({ error: qErr?.message || 'Quote create failed' }, { status: 500 })
  const quote = quoteData as { id: string; total: number | null }

    // 5) Next PO number
    const { data: poNumData, error: rpcErr } = await (sb as any).rpc('next_po_number', { p_company_id: company.id })
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    const poNumber = (poNumData as string) || 'PO-ERROR'

    // 6) Create PO (skip PDF for demo)
  const { data: po, error: poErr } = await (sb as any)
      .from('pos')
      .insert({
        company_id: company.id,
        job_id: job.id,
        rfq_id: rfq.id,
    quote_id: quote.id,
        supplier_id: supplier.id,
        po_number: poNumber,
    total: quote.total ?? 0,
        status: 'issued',
      })
      .select('id, po_number')
      .single()
    if (poErr || !po) return NextResponse.json({ error: poErr?.message || 'PO create failed' }, { status: 500 })

    // Mark quote selected (optional)
  await (sb as any).from('quotes').update({ status: 'selected' }).eq('id', quote.id)

    return NextResponse.json({ company_id: company.id, job_id: job.id, po_id: po.id, po_number: po.po_number })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Demo PO failed' }, { status: 500 })
  }
}
