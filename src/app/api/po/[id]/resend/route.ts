import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { supabaseService } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { audit } from '@/lib/audit'
import { broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  try { enforceRole('manager', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
  const actorId = session.user?.id
    const id = context?.params?.id
    const sb = supabaseService()
  const { data: po, error } = await (sb as any).from('pos').select('*').eq('id', id).eq('company_id', companyId).single()
    if (error || !po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })
    if (!(po as any).supplier_id) return NextResponse.json({ error: 'PO missing supplier' }, { status: 400 })
    const { data: supplier } = await (sb as any).from('suppliers').select('email,name').eq('id', (po as any).supplier_id).single()
    if (!(supplier as any)?.email) return NextResponse.json({ error: 'Supplier missing email' }, { status: 400 })
  await sendEmail({ to: (supplier as any).email as string, subject: `Purchase Order (Resent): ${(po as any).po_number}`, text: 'Please confirm receipt of this PO.', html: `<p>Please confirm receipt of this PO.</p>` })
    await audit(companyId, actorId || null, 'po', id, 'resend', { supplier: (supplier as any).email })
  try { await broadcastDashboardUpdated(companyId) } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
