import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'
import { renderPOPdf } from 'pdf/po'
import { uploadPublic } from '@/lib/storage'
import { broadcastPoUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, context: any) {
  try {
    const { companyId } = getIds(req)
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
    await sb.from('pos').update({ pdf_url: url }).eq('id', id)
  // Notify listeners
  await broadcastPoUpdated(id, ['pdf_url'])

    return NextResponse.json({ url })
  } catch (e: any) {
    const msg = e?.message || 'PDF generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
