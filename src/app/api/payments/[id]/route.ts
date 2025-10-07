import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

// GET: Fetch single payment
export async function GET(req: NextRequest, ctx: any) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })

    const id = ctx?.params?.id
    const sb = supabaseService()
    const { data, error } = await (sb as any)
      .from('payments')
      .select('*, projects(name), purchase_orders(id, vendor), expenses(id, vendor)')
      .eq('id', id)
      .eq('company_id', session.companyId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (e: any) {
    console.error('GET /api/payments/[id] error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

// PATCH: Update payment
export async function PATCH(req: NextRequest, ctx: any) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })

    // Only Admin or Accountant can update payments
    enforceRole('accountant', session)

    const id = ctx?.params?.id
    const body = await req.json()
    const sb = supabaseService()

    // Verify payment exists and belongs to company
    const { data: existing, error: fetchError } = await (sb as any)
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('company_id', session.companyId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Update payment
    const updateData: any = {}
    if (body.vendor_name !== undefined) updateData.vendor_name = body.vendor_name
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.payment_date !== undefined) updateData.payment_date = body.payment_date
    if (body.payment_method !== undefined) updateData.payment_method = body.payment_method
    if (body.reference_number !== undefined) updateData.reference_number = body.reference_number
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.status !== undefined) updateData.status = body.status

    updateData.updated_at = new Date().toISOString()

    const { data: updated, error } = await (sb as any)
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', session.companyId)
      .select('*')
      .single()

    if (error || !updated) {
      console.error('Payment update error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to update payment' }, { status: 500 })
    }

    // Log activity
    await audit(
      session.companyId,
      session.user.id,
      'payment',
      id,
      'update',
      { changes: updateData }
    )

    // Broadcast update
    await broadcastDashboardUpdated(session.companyId)

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: any) {
    console.error('PATCH /api/payments/[id] error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

// DELETE: Delete payment
export async function DELETE(req: NextRequest, ctx: any) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })

    // Only Admin can delete payments
    enforceRole('admin', session)

    const id = ctx?.params?.id
    const sb = supabaseService()

    // Verify payment exists
    const { data: existing, error: fetchError } = await (sb as any)
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('company_id', session.companyId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Delete payment
    const { error } = await (sb as any)
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('company_id', session.companyId)

    if (error) {
      console.error('Payment deletion error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to delete payment' }, { status: 500 })
    }

    // Log activity
    await audit(
      session.companyId,
      session.user.id,
      'payment',
      id,
      'delete',
      { vendor_name: existing.vendor_name, amount: existing.amount }
    )

    // Broadcast update
    await broadcastDashboardUpdated(session.companyId)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/payments/[id] error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
