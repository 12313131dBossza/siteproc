import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'
import { renderPOPdf } from 'pdf/po'
import { uploadPublic } from '@/lib/storage'
import { broadcastPoUpdated, broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRe.test(String(id))) {
      return NextResponse.json({ error: 'Invalid id format (expected UUID)' }, { status: 400 })
    }

    const sb = supabaseService()
    const { data: po, error } = await sb
      .from('pos')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single()

    if (error || !po) return NextResponse.json({ error: error?.message || 'PO not found' }, { status: 404 })

    // Render and upload PDF
    const pdfBuf = await renderPOPdf(id)
    const url = await uploadPublic(`pos/${id}.pdf`, pdfBuf, 'application/pdf')
  await (sb as any).from('pos').update({ pdf_url: url } as any).eq('id', id)
  // Notify listeners
  await broadcastPoUpdated(id, ['pdf_url'])
  try { await broadcastDashboardUpdated(companyId) } catch {}

    return NextResponse.json({ url })
  } catch (e: any) {
    const msg = e?.message || 'PDF generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
