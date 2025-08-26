import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { renderPOPdf } from 'pdf/po'
import { uploadPublic } from '../../../../../lib/storage'
import { sendEmail, getFromAddress } from '@/lib/email'
import { broadcastPoUpdated, broadcastJobPo, broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, context: any) {
  const session = await getSessionProfile()
  try { enforceRole('manager', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
  const actorId = session.user?.id
  const quoteId = context?.params?.id
  const sb = supabaseService()

  const { data: quote } = await (sb as any).from('quotes').select('*').eq('id', quoteId).single()
  if (!quote || quote.company_id !== companyId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: rfq } = await (sb as any).from('rfqs').select('*').eq('id', quote.rfq_id as string).single()
  if (!rfq) return NextResponse.json({ error: 'RFQ missing' }, { status: 400 })

  const { data: job } = await (sb as any).from('jobs').select('*').eq('id', (rfq as any).job_id as string).single()

  // Next PO number
  const { data: poNumData, error: rpcErr } = await (sb as any).rpc('next_po_number', { p_company_id: companyId })
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
  const poNumber = (poNumData as string) || 'PO-ERROR'

  // Create PO
  const { data: po, error: poErr } = await (sb as any)
    .from('pos')
    .insert({
      company_id: companyId,
      job_id: job?.id,
      rfq_id: rfq.id,
      quote_id: quoteId,
      supplier_id: quote.supplier_id,
      po_number: poNumber,
      total: quote.total,
      status: 'issued',
    })
    .select('*')
    .single()

  if (poErr || !po) return NextResponse.json({ error: poErr?.message || 'PO create failed' }, { status: 500 })

  // Render PDF and upload to Supabase Storage
  const pdfBuf = await renderPOPdf(po.id as string)
  const url = await uploadPublic(`pos/${po.id}.pdf`, pdfBuf, 'application/pdf')
  await (sb as any).from('pos').update({ pdf_url: url } as any).eq('id', po.id as string)

  // Email supplier if available
  if (po.supplier_id) {
  const { data: supplier } = await (sb as any).from('suppliers').select('email,name').eq('id', po.supplier_id).single()
  if ((supplier as any)?.email) {
      await sendEmail({
  to: (supplier as any).email as string,
        from: getFromAddress(),
        subject: `Purchase Order ${poNumber}`,
        text: `Your PO is ready. Download: ${url}`,
      })
    }
  }

  // Mark quote selected, others rejected
  await (sb as any).from('quotes').update({ status: 'selected' } as any).eq('id', quoteId)
  await (sb as any).from('quotes').update({ status: 'rejected' } as any).eq('rfq_id', (rfq as any).id as string).neq('id', quoteId)

  await audit(companyId, actorId || null, 'po', po.id as string, 'create_from_quote', { quote_id: quoteId, po_number: poNumber })

  // Broadcast PO created (PO channel + job aggregate)
  await broadcastPoUpdated(po.id as string, ['created'])
  try { await broadcastDashboardUpdated(companyId) } catch {}
  if (po.job_id) {
    try { await broadcastJobPo(po.job_id as string, po.id as string) } catch {}
  }

  return NextResponse.json({ po_id: po.id, po_number: poNumber })
}
