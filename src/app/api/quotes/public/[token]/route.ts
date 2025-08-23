import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { quoteSubmitSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { parseJson } from '@/lib/api'
import { verifyPublicSignature } from '@/lib/tokens'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

const MAX_JSON_BYTES = 10 * 1024 // 10 KB safety cap

export async function POST(req: NextRequest, context: any) {
  // Public submission. Rate-limiting note: add IP-based limit in edge later.
  try {
    if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }
    const bodyText = await req.text()
    if (bodyText.length > MAX_JSON_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    const raw = JSON.parse(bodyText || '{}')
    const sig = req.headers.get('x-signature') || undefined
    if (config.hmacRequire) {
      if (!verifyPublicSignature(raw, sig, { requireTs: true, maxDriftMs: config.hmacMaxDriftMs, requireNonce: true })) {
        const r = NextResponse.json({ error: 'Bad signature' }, { status: 401 })
        r.headers.set('X-Token-Attempt', '1')
        return r
      }
    }
    const parsed = quoteSubmitSchema.parse(raw)

    const token = context?.params?.token
    const sb = supabaseService()
  const { data: rfq } = await sb.from('rfqs').select('*').eq('public_token', token).single()
    if (!rfq) {
      const r = NextResponse.json({ error: 'Invalid link' }, { status: 404 })
      r.headers.set('X-Token-Attempt', '1')
      return r
    }
  // Optionally enforce one-time token (invalidate after first successful submit)
  if (config.coOneTime && rfq.public_token_used_at) return NextResponse.json({ error: 'Already used' }, { status: 410 })

  const { data: ins, error } = await sb
      .from('quotes')
      .insert({
        company_id: rfq.company_id,
        rfq_id: rfq.id,
        supplier_id: parsed.supplier_id ?? null,
        total: parsed.total,
        lead_time: parsed.lead_time,
        terms: parsed.terms,
        notes: parsed.notes,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (config.coOneTime) {
      await sb.from('rfqs').update({ public_token_used_at: new Date().toISOString() } as any).eq('id', rfq.id as any)
    }

  try { await audit(rfq.company_id as string, null, 'quote', ins?.id as string, 'public_submit', { rfq_id: rfq.id }, { ip: req.headers.get('x-forwarded-for'), userAgent: req.headers.get('user-agent') }) } catch {}
  const res = NextResponse.json({ id: ins?.id })
  res.headers.set('X-Public-IP', req.headers.get('x-forwarded-for') || 'local')
  res.headers.set('X-User-Agent', req.headers.get('user-agent') || '')
  return res
  } catch (e: any) {
    if (e instanceof Response) {
      return new NextResponse(await e.text(), { status: (e as any).status || 400 })
    }
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
