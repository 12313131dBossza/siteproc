import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { broadcastDeliveryUpdated, broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

/**
 * POST /api/deliveries/[id]/upload-proof
 * Upload a proof of delivery (POD) file for a delivery
 *
 * Expects: multipart/form-data with file field
 * Returns: { ok: true, proof_url: string, signed_url: string } or error
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionProfile()
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Enforce manager+ role for uploading POD
    try {
      enforceRole('manager', session)
    } catch (e) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const deliveryId = params.id
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: 5MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, PDF` },
        { status: 400 }
      )
    }

    // Get delivery to verify it exists
    const sb = supabaseService()
    const { data: delivery, error: fetchError } = await (sb as any)
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('company_id', session.companyId)
      .single()

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Upload file to Supabase Storage
    const bucket = 'proofs'
    const fileName = `${delivery.company_id}/${deliveryId}/${Date.now()}-${file.name}`

    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await sb.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Generate signed URL (7 days)
    const { data: signedData, error: signError } = await sb.storage
      .from(bucket)
      .createSignedUrl(uploadData.path, 7 * 24 * 60 * 60) // 7 days in seconds

    if (signError) {
      console.error('Signed URL error:', signError)
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    // Update delivery record with proof_url
    const { data: updatedDelivery, error: updateError } = await (sb as any)
      .from('deliveries')
      .update({
        proof_url: signedData.signedUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId)
      .eq('company_id', session.companyId)
      .select('*')
      .single()

    if (updateError || !updatedDelivery) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save proof URL to delivery' },
        { status: 500 }
      )
    }

    // Log activity
    await audit(
      session.companyId,
      session.user.id,
      'delivery',
      deliveryId,
      'updated',
      {
        action: 'proof_uploaded',
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: uploadData.path
      }
    )

    // Broadcast updates
    await Promise.all([
      broadcastDeliveryUpdated(deliveryId, ['proof_url']),
      broadcastDashboardUpdated(session.companyId)
    ])

    return NextResponse.json(
      {
        ok: true,
        proof_url: signedData.signedUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('POST /api/deliveries/[id]/upload-proof error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
