import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { appBaseUrl } from '@/lib/api'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { sendEmail, getFromAddress } from '@/lib/email'
import { broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, context: any) {
  const session = await getSessionProfile()
  try { enforceRole('manager', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
  const actorId = session.user?.id
  const rfqId = context?.params?.id
  const sb = supabaseService()

  const { data: rfq, error } = await (sb as any).from('rfqs').select('*').eq('id', rfqId).eq('company_id', companyId).single()
  if (error || !rfq) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })

  const { data: suppliers } = await (sb as any).from('suppliers').select('id,name,email').eq('company_id', companyId)
  const publicUrl = `${appBaseUrl()}/api/quotes/public/${rfq.public_token}`

  const emails = (suppliers || []).filter((s: any) => !!s.email)
  if (emails.length === 0) return NextResponse.json({ message: 'No supplier emails to send' })

  const messages = emails.map((s: any) => ({
    to: s.email,
    from: getFromAddress(),
    subject: `RFQ: ${rfq.title || rfq.id}`,
    text: `Please submit your quote here: ${publicUrl}`,
  }))

  await sendEmail(messages as any)

  await (sb as any).from('rfqs').update({ status: 'sent' } as any).eq('id', rfqId)
  try { await broadcastDashboardUpdated(companyId) } catch {}
  await audit(companyId, actorId || null, 'rfq', rfqId, 'send', { recipient_count: emails.length })

  return NextResponse.json({ ok: true, recipients: emails.length })
}
