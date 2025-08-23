import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { getFromAddress, sendEmail } from '@/lib/email'
import { verifyPublicSignature } from '@/lib/tokens'
import { config } from '@/lib/config'
import { broadcastJobChangeOrder } from '@/lib/realtime'

export const runtime = 'nodejs'

const MAX_JSON_BYTES = 4 * 1024

export async function POST(req: NextRequest, context: any) {
  try {
    if (req.headers.get('content-type') && req.headers.get('content-type') !== 'application/json') {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }
    let raw: any = {}
    if (req.method === 'POST') {
      const text = await req.text()
      if (text.length > MAX_JSON_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      raw = text ? JSON.parse(text) : {}
    }
    const sig = req.headers.get('x-signature') || undefined
    if (config.hmacRequire) {
      if (!verifyPublicSignature(raw, sig, { requireTs: true, maxDriftMs: config.hmacMaxDriftMs, requireNonce: true })) {
        const r = NextResponse.json({ error: 'Bad signature' }, { status: 401 })
        r.headers.set('X-Token-Attempt', '1')
        return r
      }
    }

  const token = context?.params?.token
    const sb = supabaseService()
  const { data: co } = await sb.from('change_orders').select('*').eq('public_token', token).single()
    if (!co) {
      const r = NextResponse.json({ error: 'Invalid link' }, { status: 404 })
      r.headers.set('X-Token-Attempt', '1')
      return r
    }
  if (config.coOneTime && co.public_token_used_at) return NextResponse.json({ error: 'Already used' }, { status: 410 })
    const coId = co.id as string
    const companyId = co.company_id as string
    const approverEmail = co.approver_email as string | null
    const costDelta = co.cost_delta as any

  const { error } = await sb.from('change_orders').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', coId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (config.coOneTime) {
      await sb.from('change_orders').update({ public_token_used_at: new Date().toISOString() }).eq('id', coId)
    }

  try { await audit(companyId, null, 'change_order', coId, 'approve', { cost_delta: costDelta }, { ip: req.headers.get('x-forwarded-for'), userAgent: req.headers.get('user-agent') }) } catch {}
    try {
      if (approverEmail) {
        await sendEmail({
          to: approverEmail,
          from: getFromAddress(),
            subject: 'Change Order Approved',
          text: `Approval recorded for change order ${coId}.`,
        })
      }
    } catch {}

    // Broadcast job change order event (best effort)
    if (co.job_id) { try { await broadcastJobChangeOrder(co.job_id as string, coId, 'approved') } catch {} }

  const res = NextResponse.json({ ok: true })
  res.headers.set('X-Public-IP', req.headers.get('x-forwarded-for') || 'local')
  res.headers.set('X-User-Agent', req.headers.get('user-agent') || '')
  return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
