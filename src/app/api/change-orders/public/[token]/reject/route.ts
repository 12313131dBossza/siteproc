import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { verifyPublicSignature } from '@/lib/tokens'
import { config } from '@/lib/config'
import { sendEmail } from '@/lib/email'
import { broadcastJobChangeOrder, broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

const MAX_JSON_BYTES = 2 * 1024

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
  const { data: co } = await (sb as any).from('change_orders').select('*').eq('public_token', token).single()
    if (!co) {
      const r = NextResponse.json({ error: 'Invalid link' }, { status: 404 })
      r.headers.set('X-Token-Attempt', '1')
      return r
    }
    if (config.coOneTime && co.public_token_used_at) return NextResponse.json({ error: 'Already used' }, { status: 410 })
  const { error } = await (sb as any).from('change_orders').update({ status: 'rejected', approved_at: null, public_token_used_at: config.coOneTime ? new Date().toISOString() : (co as any).public_token_used_at } as any).eq('id', (co as any).id as string)
  try { await broadcastDashboardUpdated((co as any).company_id) } catch {}
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit((co as any).company_id as string, null, 'change_order', (co as any).id as string, 'reject', { cost_delta: (co as any).cost_delta }, { ip: req.headers.get('x-forwarded-for'), userAgent: req.headers.get('user-agent') }) } catch {}
    // Fire notification email best-effort (silently ignore failures)
    try {
      if ((co as any).approver_email) {
        await sendEmail({ to: (co as any).approver_email as string, subject: `Change Order Rejected: ${(co as any).id}` , text: `Change order was rejected. Amount: ${(co as any).cost_delta}` })
      }
    } catch {}
  if ((co as any).job_id) { try { await broadcastJobChangeOrder((co as any).job_id as string, (co as any).id as string, 'rejected') } catch {} }
  const res = NextResponse.json({ ok: true })
    res.headers.set('X-Public-IP', req.headers.get('x-forwarded-for') || 'local')
    res.headers.set('X-User-Agent', req.headers.get('user-agent') || '')
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
