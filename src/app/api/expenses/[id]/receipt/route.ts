import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'
import { broadcastExpenseUpdated } from '@/lib/realtime'
import { uploadPrivateSigned } from '@/lib/storage'
import { parseDataUrl, validateImageBytes } from '@/lib/uploadValidate'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

// Original parse replaced by shared util in uploadValidate.ts

export async function POST(req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const { receipt_data_url } = await req.json().catch(()=>({})) as any
    if (!receipt_data_url) return NextResponse.json({ error: 'receipt_data_url required' }, { status: 400 })
    const sb = supabaseService()
  const { data: exp } = await sb.from('expenses').select('id,job_id').eq('company_id', companyId).eq('id', id).single()
  if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { mime, buf } = parseDataUrl(receipt_data_url)
  const v = validateImageBytes(buf, mime)
  if (!v.ok) return NextResponse.json({ error: `invalid_image:${v.reason}` }, { status: 400 })
  const finalMime = v.detectedType || mime
  const ext = finalMime.split('/')[1] || 'bin'
  const url = await uploadPrivateSigned(`expenses/${id}/receipt.${ext}`, buf, finalMime)
  const { error } = await (sb as any).from('expenses').update({ receipt_url: url } as any).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await broadcastExpenseUpdated(id, ['receipt'])
  return NextResponse.json({ ok: true, url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
