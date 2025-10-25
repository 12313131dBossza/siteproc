import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'
import { broadcastDeliveryUpdated, broadcast } from '@/lib/realtime'
import { EVENTS } from '@/lib/constants'
import { sendDeliveryConfirmationNotification } from '@/lib/email'
import { getCompanyAdminEmails } from '@/lib/server-utils'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const sb = supabaseService()
  const { data: delivery } = await (sb as any)
    .from('deliveries')
    .select(`
      id,
      status,
      job_id,
      delivery_date,
      notes,
      projects:job_id(
        id,
        name
      )
    `)
    .eq('company_id', companyId)
    .eq('id', id)
    .single()
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((delivery as any).status === 'delivered') return NextResponse.json({ ok: true, status: 'delivered' })
    const { error } = await (sb as any)
      .from('deliveries')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() } as any)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    
    // Send email notification to admins
    try {
      const adminEmails = await getCompanyAdminEmails(companyId)
      const projectName = (delivery as any)?.projects?.name || 'Unknown Project'
      const deliveryDate = (delivery as any)?.delivery_date || new Date().toISOString().split('T')[0]
      const deliveryNotes = (delivery as any)?.notes || 'No notes provided'
      
      if (adminEmails.length > 0) {
        await sendDeliveryConfirmationNotification({
          deliveryId: id,
          projectName: projectName,
          deliveryDate: deliveryDate,
          deliveryNotes: deliveryNotes,
          companyName: 'Your Company',
          recipientName: adminEmails[0],
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/deliveries`
        })
      }
    } catch (emailError) {
      console.error('Failed to send delivery confirmation notification:', emailError)
      // Don't fail the request if email fails
    }
    
    await Promise.all([
      broadcastDeliveryUpdated(id, ['status']),
  (delivery as any)?.job_id ? broadcast(`job:${(delivery as any).job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { job_id: (delivery as any).job_id, delivery_id: id, at: new Date().toISOString(), status: 'delivered' }) : Promise.resolve(),
    ])
    return NextResponse.json({ ok: true, status: 'delivered' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
