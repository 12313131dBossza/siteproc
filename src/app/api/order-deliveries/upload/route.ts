import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile, enforceRole } from '@/lib/auth'
import { uploadPrivateSigned } from '@/lib/storage'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'Company required' }, { status: 400 })
    
    // Only bookkeeper and above can upload delivery proofs
    enforceRole('bookkeeper', session)

    const formData = await req.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('order_id') as string
    const productId = formData.get('product_id') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!orderId || !productId) {
      return NextResponse.json({ error: 'Order ID and Product ID required' }, { status: 400 })
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `delivery-proofs/${session.companyId}/${orderId}/${productId}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase storage with signed URL (24 hour expiry)
    const signedUrl = await uploadPrivateSigned(filePath, buffer, file.type, 24 * 60 * 60)

    return NextResponse.json({
      url: signedUrl,
      fileName,
      filePath,
      size: file.size,
      contentType: file.type,
    })

  } catch (error) {
    console.error('Error uploading delivery proof:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
