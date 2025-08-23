import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'
import { broadcastDeliveryUpdated, broadcast } from '@/lib/realtime'
import { uploadPrivateSigned } from '@/lib/storage'
import { parseDataUrl, validateImageBytes } from '@/lib/uploadValidate'
import { config } from '@/lib/config'
import { EVENTS } from '@/lib/constants'

export const runtime = 'nodejs'

const bodySchema = {
  parse(data: any) {
    if (!data || typeof data !== 'object') throw new Error('invalid body')
    if (!Array.isArray(data.photo_data_urls) && !data.signature_data_url) throw new Error('photo_data_urls or signature_data_url required')
    return data as { photo_data_urls?: string[]; signature_data_url?: string }
  },
}

async function uploadDataUrl(path: string, dataUrl: string) {
  const { mime, buf } = parseDataUrl(dataUrl)
  const v = validateImageBytes(buf, mime)
  if (!v.ok) throw new Error('invalid_image:' + v.reason)
  const finalMime = v.detectedType || mime
  return uploadPrivateSigned(path, buf, finalMime)
}

export async function POST(req: NextRequest, context: any) {
  try {
    const { companyId } = getIds(req)
    const id = context?.params?.id
    const sb = supabaseService()
    const { data: delivery } = await sb.from('deliveries').select('id,job_id').eq('company_id', companyId).eq('id', id).single()
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const raw = await req.json().catch(() => null)
    const body = bodySchema.parse(raw)

    const added: { photos: number; signature: boolean } = { photos: 0, signature: false }
    if (Array.isArray(body.photo_data_urls)) {
      for (let i = 0; i < body.photo_data_urls.length; i++) {
        const url = await uploadDataUrl(`deliveries/${id}/extra_${Date.now()}_${i}.jpg`, body.photo_data_urls[i])
        await sb.from('photos').insert({ company_id: companyId, job_id: delivery.job_id, entity: 'delivery', entity_id: id, url })
        added.photos++
      }
    }
    if (body.signature_data_url) {
      const url = await uploadDataUrl(`deliveries/${id}/signature.png`, body.signature_data_url)
      await sb.from('deliveries').update({ signature_url: url, signer_name: 'Signed' }).eq('id', id)
      added.signature = true
    }
    const fields: string[] = []
    if (added.photos) fields.push('photos')
    if (added.signature) fields.push('signature')
    await Promise.all([
      broadcastDeliveryUpdated(id, fields.length ? fields : ['media']),
      broadcast(`job:${delivery.job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { job_id: delivery.job_id, delivery_id: id, at: new Date().toISOString(), photos_added: added.photos, signature: added.signature }),
    ])
    return NextResponse.json({ ok: true, ...added })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
