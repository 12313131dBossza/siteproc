import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

// Use the Web Request type for the first arg (per Next.js route handler spec) and cast when calling helpers.
export async function GET(request: Request, context: any) {
  try {
  const nextReq = request as unknown as NextRequest
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
  const id = context?.params?.id
    const sb = supabaseService()
    const { data: co, error } = await sb
      .from('change_orders')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single()
    if (error || !co) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
    return NextResponse.json(co)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
    
    const companyId = session.companyId
    const id = context?.params?.id
    
    if (!id) {
      return NextResponse.json({ error: 'Change order ID is required' }, { status: 400 })
    }
    
    const sb = supabaseService()
    
    // First verify the change order exists and belongs to this company
    const { data: existing, error: fetchError } = await sb
      .from('change_orders')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('id', id)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }
    
    // Delete the change order
    const { error: deleteError } = await sb
      .from('change_orders')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting change order:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    return NextResponse.json({ ok: true, message: 'Change order deleted successfully' })
  } catch (e: any) {
    console.error('Delete change order error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to delete change order' }, { status: 500 })
  }
}
