import { NextRequest, NextResponse } from 'next/server'
import { getIds, requireRole } from '@/lib/api'
import { supabaseService } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { audit } from '@/lib/audit'
import { config as appCfg } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { companyId, actorId, role } = getIds(req)
    requireRole(role, 'admin')
    const rfqId = params.id
    const sb = supabaseService()
    const { data: rfq, error } = await sb.from('rfqs').select('*').eq('id', rfqId).eq('company_id', companyId).single()
    if (error || !rfq) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    const { data: quotes } = await sb.from('quotes').select('id,supplier_id').eq('rfq_id', rfqId)
    const supplierIds = (quotes||[]).map(q=>q.supplier_id).filter(Boolean)
    const { data: suppliers } = supplierIds.length ? await sb.from('suppliers').select('id,email').in('id', supplierIds) : { data: [] }
  const emails: string[] = (suppliers||[]).map(s=>s.email).filter((e: any): e is string => typeof e === 'string' && !!e)
    if (!emails.length) return NextResponse.json({ error: 'No supplier emails' }, { status: 400 })
  const base = process.env.APP_BASE_URL || 'http://localhost:3000'
  const publicUrl = `${base}/api/quotes/public/${rfq.public_token}`
  await sendEmail(emails.map(e => ({ to: e as string, subject: `RFQ (Resent): ${rfq.title || rfq.id}`, text: `Submit quote: ${publicUrl}`, html: `<p>Submit quote: <a href='${publicUrl}'>link</a></p>` })))
    await audit(companyId, actorId || null, 'rfq', rfqId, 'resend', { recipients: emails.length })
    return NextResponse.json({ ok: true, recipients: emails.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
