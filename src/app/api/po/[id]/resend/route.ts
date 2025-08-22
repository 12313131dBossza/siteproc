import { NextRequest, NextResponse } from 'next/server'
import { getIds, requireRole } from '@/lib/api'
import { supabaseService } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { audit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { companyId, actorId, role } = getIds(req)
    requireRole(role, 'admin')
    const id = params.id
    const sb = supabaseService()
    const { data: po, error } = await sb.from('pos').select('*').eq('id', id).eq('company_id', companyId).single()
    if (error || !po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })
    if (!po.supplier_id) return NextResponse.json({ error: 'PO missing supplier' }, { status: 400 })
    const { data: supplier } = await sb.from('suppliers').select('email,name').eq('id', po.supplier_id).single()
    if (!supplier?.email) return NextResponse.json({ error: 'Supplier missing email' }, { status: 400 })
  await sendEmail({ to: supplier.email as string, subject: `Purchase Order (Resent): ${po.po_number}`, text: 'Please confirm receipt of this PO.', html: `<p>Please confirm receipt of this PO.</p>` })
    await audit(companyId, actorId || null, 'po', id, 'resend', { supplier: supplier.email })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
